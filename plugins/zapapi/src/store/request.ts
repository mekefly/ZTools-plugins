import { reactive } from 'vue'

export interface RequestState {
  method: string
  url: string
  params: Array<{ key: string; value: string; enabled: boolean }>
  headers: Array<{ key: string; value: string; enabled: boolean }>
  auth: {
    type: 'none' | 'bearer' | 'basic' | 'apikey'
    token: string
    username: string
    password: string
    apiKey: string
    apiKeyLocation: 'header' | 'query'
    apiKeyHeader: string
  }
  body: {
    type: 'none' | 'json' | 'formdata' | 'urlencoded' | 'raw'
    raw: string
    formData: Array<{ key: string; value: string; enabled: boolean; isFile: boolean }>
  }
}

export interface ResponseState {
  status: number | null
  statusText: string
  time: number | null
  size: number | null
  headers: Record<string, string>
  body: string
  raw: string
  error: string | null
  contentType: string
  isBinary: boolean
  base64Body: string | null
  fileName: string | null
}

const defaultRequest: RequestState = {
  method: 'GET',
  url: '',
  params: [],
  headers: [],
  auth: {
    type: 'none',
    token: '',
    username: '',
    password: '',
    apiKey: '',
    apiKeyLocation: 'header',
    apiKeyHeader: 'X-API-Key'
  },
  body: {
    type: 'none',
    raw: '',
    formData: []
  }
}

const defaultResponse: ResponseState = {
  status: null,
  statusText: '',
  time: null,
  size: null,
  headers: {},
  body: '',
  raw: '',
  error: null,
  contentType: '',
  isBinary: false,
  base64Body: null,
  fileName: null
}

const request = reactive<RequestState>({ ...defaultRequest })
const response = reactive<ResponseState>({ ...defaultResponse })

function cloneState<T>(state: T): T {
  return JSON.parse(JSON.stringify(state)) as T
}

function normalizeRequestState(data: Partial<RequestState>): RequestState {
  return {
    ...defaultRequest,
    ...data,
    auth: {
      ...defaultRequest.auth,
      ...data.auth
    },
    body: {
      ...defaultRequest.body,
      ...data.body,
      formData: data.body?.formData ? cloneState(data.body.formData) : []
    },
    params: data.params ? cloneState(data.params) : [],
    headers: data.headers ? cloneState(data.headers) : []
  }
}

export function useRequestStore(): {
  request: RequestState
  response: ResponseState
  setRequest: (data: Partial<RequestState>) => void
  loadRequest: (data: RequestState) => void
  resetRequest: () => void
  setResponse: (data: Partial<ResponseState>) => void
  resetResponse: () => void
  getRequestSnapshot: () => RequestState
} {
  function setRequest(data: Partial<RequestState>): void {
    Object.assign(request, normalizeRequestState({ ...request, ...data }))
  }

  function loadRequest(data: RequestState): void {
    Object.assign(request, normalizeRequestState(cloneState(data)))
  }

  function resetRequest(): void {
    Object.assign(request, cloneState(defaultRequest))
  }

  function setResponse(data: Partial<ResponseState>): void {
    Object.assign(response, data)
  }

  function resetResponse(): void {
    Object.assign(response, cloneState(defaultResponse))
  }

  function getRequestSnapshot(): RequestState {
    return JSON.parse(JSON.stringify(request))
  }

  return {
    request,
    response,
    setRequest,
    loadRequest,
    resetRequest,
    setResponse,
    resetResponse,
    getRequestSnapshot
  }
}
