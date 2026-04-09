import { resolveVariables } from './variableResolver'

export type HttpUrlNormalizeError = 'empty' | 'invalid' | 'unsupported_protocol'

export interface HttpUrlNormalizeResult {
  ok: boolean
  url: string
  reason?: HttpUrlNormalizeError
}

const SCHEME_PATTERN = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//

export function normalizeHttpUrl(input: string, variables: Record<string, string>): HttpUrlNormalizeResult {
  const resolved = resolveVariables(input, variables).trim()
  if (!resolved) {
    return {
      ok: false,
      url: '',
      reason: 'empty'
    }
  }

  const withScheme = SCHEME_PATTERN.test(resolved) ? resolved : `http://${resolved}`

  try {
    const parsed = new URL(withScheme)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return {
        ok: false,
        url: withScheme,
        reason: 'unsupported_protocol'
      }
    }
  } catch {
    return {
      ok: false,
      url: withScheme,
      reason: 'invalid'
    }
  }

  return {
    ok: true,
    url: withScheme
  }
}
