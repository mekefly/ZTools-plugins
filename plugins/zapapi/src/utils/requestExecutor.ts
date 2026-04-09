import type { RequestState } from '../store/request'
import { resolveVariables } from './variableResolver'
import { normalizeHttpUrl } from './urlNormalizer'
import { createJwtToken } from './jwt'
import { createDigestAuthorization } from './digestAuth'
import { getFormDataFile } from './formDataFileStore'

export interface SendResult {
  status: number
  statusText: string
  headers: Record<string, string>
  body: string
  raw: string
  base64Body: string | null
  contentType: string
  isBinary: boolean
  fileName: string | null
  time: number
  size: number
  error: string | null
}

export interface SendController {
  cancel: () => void
  promise: Promise<SendResult>
}

function getQuerySeparator(url: string): string {
  if (url.includes('?')) {
    return '&'
  }

  return '?'
}

function parseContentDispositionFileName(contentDisposition: string): string | null {
  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition)
  if (utf8Match && utf8Match[1]) {
    return decodeURIComponent(utf8Match[1].replace(/"/g, ''))
  }

  const normalMatch = /filename="?([^";]+)"?/i.exec(contentDisposition)
  if (normalMatch && normalMatch[1]) {
    return normalMatch[1]
  }

  return null
}

function isLikelyBinaryContent(contentType: string): boolean {
  const lowered = contentType.toLowerCase()
  if (!lowered) {
    return false
  }

  if (lowered.startsWith('text/')) {
    return false
  }

  if (lowered.includes('json') || lowered.includes('xml') || lowered.includes('javascript')) {
    return false
  }

  return true
}

const REQUEST_TIMEOUT_MS = 15000

function resolveBodyKind(req: RequestState): 'none' | 'text' | 'structured' | 'binary' | 'other' {
  if (req.body.kind) {
    return req.body.kind
  }

  if (req.body.type === 'none') return 'none'
  if (req.body.type === 'urlencoded' || req.body.type === 'formdata') return 'structured'
  if (req.body.type === 'json') return 'text'
  return 'other'
}

function resolveBodyContentType(req: RequestState): string {
  if (req.body.contentType) {
    return req.body.contentType
  }

  if (req.body.type === 'json') return 'application/json'
  if (req.body.type === 'urlencoded') return 'application/x-www-form-urlencoded'
  if (req.body.type === 'formdata') return 'multipart/form-data'
  return ''
}

function buildUrl(req: RequestState, variables: Record<string, string>): string {
  const normalized = normalizeHttpUrl(req.url, variables)
  if (!normalized.ok) {
    throw new Error(normalized.reason === 'unsupported_protocol' ? 'Only HTTP/HTTPS URLs are supported' : 'Invalid URL')
  }

  let url = normalized.url

  const enabledParams = req.params.filter((p) => p.enabled && p.key)
  if (enabledParams.length > 0) {
    const query = enabledParams
      .map((p) => `${encodeURIComponent(resolveVariables(p.key, variables))}=${encodeURIComponent(resolveVariables(p.value, variables))}`)
      .join('&')
    url += `${getQuerySeparator(url)}${query}`
  }

  if (req.auth.type === 'apikey' && req.auth.apiKeyLocation === 'query' && req.auth.apiKey) {
    const sep = getQuerySeparator(url)
    url += `${sep}${req.auth.apiKeyHeader || 'api_key'}=${resolveVariables(req.auth.apiKey, variables)}`
  }

  return url
}

function buildHeaders(req: RequestState, variables: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {}

  if (req.auth.type === 'bearer' && req.auth.token) {
    headers['Authorization'] = `Bearer ${resolveVariables(req.auth.token, variables)}`
  } else if (req.auth.type === 'jwt-bearer') {
    // handled in executeSingleAttempt to allow async token generation
  } else if (req.auth.type === 'basic' && req.auth.username) {
    const encoded = btoa(
      `${resolveVariables(req.auth.username, variables)}:${resolveVariables(req.auth.password, variables)}`
    )
    headers['Authorization'] = `Basic ${encoded}`
  } else if (req.auth.type === 'apikey' && req.auth.apiKeyLocation === 'header') {
    headers[req.auth.apiKeyHeader || 'X-API-Key'] = resolveVariables(req.auth.apiKey, variables)
  }

  req.headers
    .filter((h) => h.enabled && h.key)
    .forEach((h) => {
      headers[resolveVariables(h.key, variables)] = resolveVariables(h.value, variables)
    })

  const bodyKind = resolveBodyKind(req)
  const bodyContentType = resolveBodyContentType(req)
  const hasContentTypeHeader = Object.keys(headers).some((key) => key.toLowerCase() === 'content-type')
  if (!hasContentTypeHeader && bodyKind !== 'none' && bodyContentType && bodyContentType !== 'multipart/form-data') {
    headers['Content-Type'] = bodyContentType
  }

  return headers
}

async function injectJwtBearerHeader(
  req: RequestState,
  headers: Record<string, string>,
  variables: Record<string, string>
): Promise<void> {
  if (req.auth.type !== 'jwt-bearer') {
    return
  }

  const secret = resolveVariables(req.auth.jwtSecret, variables)
  const headerJson = resolveVariables(req.auth.jwtHeader, variables)
  const payloadJson = resolveVariables(req.auth.jwtPayload, variables)
  const token = await createJwtToken({
    algorithm: req.auth.jwtAlgorithm,
    headerJson,
    payloadJson,
    secret,
    autoIat: req.auth.jwtAutoIat,
    autoExp: req.auth.jwtAutoExp,
    expSeconds: resolveVariables(req.auth.jwtExpSeconds, variables)
  })
  const prefix = resolveVariables(req.auth.jwtHeaderPrefix, variables).trim() || 'Bearer'
  headers.Authorization = `${prefix} ${token}`
}

function buildBody(req: RequestState, variables: Record<string, string>): BodyInit | undefined {
  const bodyKind = resolveBodyKind(req)
  const bodyContentType = resolveBodyContentType(req)

  switch (bodyKind) {
    case 'none':
      return undefined
    case 'text':
    case 'other':
      return req.body.raw ? resolveVariables(req.body.raw, variables) : undefined
    case 'binary': {
      const file = getFormDataFile(req.body.binary.fileToken)
      if (!file) {
        throw new Error('Missing binary file for request body')
      }
      return file
    }
    case 'structured':
      if (bodyContentType === 'multipart/form-data' || req.body.type === 'formdata') {
        const form = new FormData()
        if (!req.body.formData) {
          return form
        }

        for (const field of req.body.formData) {
          if (!field.enabled || !field.key) {
            continue
          }

          const key = resolveVariables(field.key, variables)
          if (field.isFile) {
            const file = getFormDataFile(field.fileToken)
            if (!file) {
              throw new Error(`Missing file for form-data field: ${key}`)
            }
            form.append(key, file, file.name)
          } else {
            form.append(key, resolveVariables(field.value, variables))
          }
        }

        return form
      }

      if (req.body.formData) {
        const params = new URLSearchParams()
        req.body.formData
          .filter((f) => f.enabled && f.key)
          .forEach((f) => {
            params.append(
              resolveVariables(f.key, variables),
              resolveVariables(f.value, variables)
            )
          })

        return params
      }

      return undefined
    default: {
      const form = new FormData()
      return form
    }
  }
}

async function responseToResult(response: Response, startTime: number): Promise<SendResult> {
  const endTime = performance.now()

  const responseHeaders: Record<string, string> = {}
  response.headers.forEach((value, key) => {
    responseHeaders[key.toLowerCase()] = value
  })

  const contentType = responseHeaders['content-type'] || ''
  const contentDisposition = responseHeaders['content-disposition'] || ''
  const fileName = parseContentDispositionFileName(contentDisposition)

  const arrayBuffer = await response.arrayBuffer()
  const size = arrayBuffer.byteLength
  const binary = isLikelyBinaryContent(contentType)

  if (binary) {
    const bytes = new Uint8Array(arrayBuffer)
    let binaryString = ''
    bytes.forEach((value) => {
      binaryString += String.fromCharCode(value)
    })
    const base64Body = btoa(binaryString)

    return {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      body: '[binary data]',
      raw: '[binary data]',
      base64Body,
      contentType,
      isBinary: true,
      fileName,
      time: Math.round(endTime - startTime),
      size,
      error: null
    }
  }

  const decoder = new TextDecoder()
  const responseText = decoder.decode(arrayBuffer)

  return {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
    body: responseText,
    raw: responseText,
    base64Body: null,
    contentType,
    isBinary: false,
    fileName,
    time: Math.round(endTime - startTime),
    size,
    error: null
  }
}

async function executeSingleAttempt(
  req: RequestState,
  variables: Record<string, string>,
  externalSignal: AbortSignal
): Promise<SendResult> {
  const startTime = performance.now()
  const url = buildUrl(req, variables)
  const headers = buildHeaders(req, variables)
  await injectJwtBearerHeader(req, headers, variables)
  const body = buildBody(req, variables)

  const controller = new AbortController()
  const onAbort = () => {
    controller.abort('user-aborted')
  }
  externalSignal.addEventListener('abort', onAbort)

  const timeoutId = setTimeout(() => {
    controller.abort('timeout')
  }, REQUEST_TIMEOUT_MS)

  const fetchOptions: RequestInit = {
    method: req.method,
    headers,
    body,
    signal: controller.signal
  }

  try {
    if (req.auth.type === 'digest' && (!req.auth.digestUsername || !req.auth.digestPassword)) {
      throw new Error('Digest auth requires username and password')
    }

    let response = await fetch(url, fetchOptions)

    if (req.auth.type === 'digest' && response.status === 401) {
      const challengeHeader = response.headers.get('www-authenticate') || ''
      if (/^Digest\s+/i.test(challengeHeader)) {
        const digestAuth = await createDigestAuthorization({
          challengeHeader,
          method: req.method,
          requestUrl: url,
          username: resolveVariables(req.auth.digestUsername, variables),
          password: resolveVariables(req.auth.digestPassword, variables),
          algorithm: req.auth.digestAlgorithm
        })

        const retryHeaders: Record<string, string> = {
          ...headers,
          Authorization: digestAuth
        }

        response = await fetch(url, {
          ...fetchOptions,
          headers: retryHeaders
        })
      }
    }

    return responseToResult(response, startTime)
  } catch (error: unknown) {
    const endTime = performance.now()
    const errName = error instanceof DOMException ? error.name : ''
    const isTimeoutAbort = controller.signal.aborted && controller.signal.reason === 'timeout'
    const isUserAbort = externalSignal.aborted || (controller.signal.aborted && controller.signal.reason === 'user-aborted')

    let errorMessage = 'Network error'
    if (isTimeoutAbort) {
      errorMessage = `Request timeout (${REQUEST_TIMEOUT_MS}ms)`
    } else if (isUserAbort || errName === 'AbortError') {
      errorMessage = 'Request canceled'
    } else if (error instanceof Error && error.message) {
      errorMessage = error.message
    }

    return {
      status: 0,
      statusText: '',
      headers: {},
      body: '',
      raw: '',
      base64Body: null,
      contentType: '',
      isBinary: false,
      fileName: null,
      time: Math.round(endTime - startTime),
      size: 0,
      error: errorMessage
    }
  } finally {
    clearTimeout(timeoutId)
    externalSignal.removeEventListener('abort', onAbort)
  }
}

export function createRequestController(
  req: RequestState,
  variables: Record<string, string>
): SendController {
  const controller = new AbortController()

  const promise = executeSingleAttempt(req, variables, controller.signal)

  return {
    cancel: () => controller.abort('user-aborted'),
    promise
  }
}

export async function sendRequest(
  req: RequestState,
  variables: Record<string, string>
): Promise<SendResult> {
  const controller = createRequestController(req, variables)
  return controller.promise
}
