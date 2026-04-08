import type { RequestState } from '../store/request'
import { resolveVariables } from './variableResolver'

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

function buildUrl(req: RequestState, variables: Record<string, string>): string {
  let url = resolveVariables(req.url, variables)

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

  return headers
}

function buildBody(req: RequestState, variables: Record<string, string>): BodyInit | undefined {
  switch (req.body.type) {
    case 'json':
      if (req.body.raw) {
        return resolveVariables(req.body.raw, variables)
      }

      return undefined
    case 'raw':
      if (req.body.raw) {
        return resolveVariables(req.body.raw, variables)
      }

      return undefined
    case 'urlencoded':
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
    case 'none':
    case 'formdata':
      return undefined
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
    const response = await fetch(url, fetchOptions)
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
