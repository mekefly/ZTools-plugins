function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function decodeHtmlEntities(str: string): string {
  let output = str
  for (let i = 0; i < 3; i += 1) {
    const next = output
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
    if (next === output) break
    output = next
  }
  return output
}

function normalizeMarkupBody(body: string): string {
  const trimmed = body.trim()
  const hasEscapedTags = /&lt;\/?[\w!]/.test(trimmed)
  const hasRawTags = /<\/?[\w!]/.test(trimmed)
  if (hasEscapedTags && !hasRawTags) {
    return decodeHtmlEntities(body)
  }
  return body
}

function c(str: string, color: string): string {
  return `<span style="color:${color}">${escapeHtml(str)}</span>`
}

function cEscaped(str: string, color: string): string {
  return `<span style="color:${color}">${str}</span>`
}

function highlightJson(json: string): string {
  return json.replace(
    /("(?:[^"\\]|\\.)*")(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?|[{}\[\],]/g,
    (m, str, colon) => {
      if (str) {
        if (colon) {
          return c(str, 'var(--accent-primary)') + c(colon, 'var(--text-muted)')
        }
        return c(str, 'var(--success-color)')
      }
      if (/true|false/.test(m)) return c(m, '#a78bfa')
      if (/null/.test(m)) return c(m, '#f472b6')
      if (/[{}\[\],]/.test(m)) return c(m, 'var(--text-muted)')
      return c(m, 'var(--warning-color)')
    }
  )
}

function isValidJson(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) {
    return false
  }
  try {
    JSON.parse(trimmed)
    return true
  } catch {
    return false
  }
}

function highlightHtml(html: string): string {
  const e = escapeHtml(html)
  return e.replace(
    /(&lt;!--[\s\S]*?--&gt;)|(&lt;\/?)([\w!][\w\-]*)((?:\s+[\w\-]+(?:\s*=\s*(?:&quot;[^&]*?&quot;|[^\s&]+))?)*)\s*(\/?&gt;)/g,
    (_m, comment, open, tag, attrs, close) => {
      if (comment) return cEscaped(comment, 'var(--text-muted)')
      let r = cEscaped(open, 'var(--text-muted)')
      r += cEscaped(tag, 'var(--accent-primary)')
      if (attrs) {
        r += attrs.replace(
          /(\s+)([\w\-]+)(\s*=\s*)?(&quot;[^&]*?&quot;|[^\s&]+)?/g,
          (_a, space, name, eq, val) => {
            let s = space + cEscaped(name, 'var(--warning-color)')
            if (eq) s += cEscaped(eq, 'var(--text-muted)')
            if (val) s += cEscaped(val, 'var(--success-color)')
            return s
          }
        )
      }
      r += cEscaped(close, 'var(--text-muted)')
      return r
    }
  )
}

function highlightJavaScript(code: string): string {
  const escaped = escapeHtml(code)
  return escaped
    .replace(/\b(const|let|var|function|return|if|else|for|while|switch|case|break|continue|try|catch|finally|async|await|new|class|extends|import|from|export|default|throw|typeof|instanceof|in|of|this)\b/g, '<span style="color:var(--accent-primary)">$1</span>')
    .replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g, '<span style="color:var(--success-color)">$1</span>')
    .replace(/\b(true|false|null|undefined)\b/g, '<span style="color:#a78bfa">$1</span>')
    .replace(/\b\d+(?:\.\d+)?\b/g, '<span style="color:var(--warning-color)">$&</span>')
    .replace(/(\/\/.*$)/gm, '<span style="color:var(--text-muted)">$1</span>')
}

function detectLang(body: string, contentType?: string): 'json' | 'html' | 'xml' | 'javascript' | 'text' {
  if (contentType) {
    const ct = contentType.toLowerCase()
    if (ct.includes('json')) return 'json'
    if (ct.includes('html')) return 'html'
    if (ct.includes('xml')) return 'xml'
    if (ct.includes('javascript') || ct.includes('ecmascript')) return 'javascript'
  }
  const t = body.trim()
  if ((t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']'))) {
    try { JSON.parse(t); return 'json' } catch { /* not json */ }
  }
  if (t.startsWith('<') && /<\/?[\w!]/.test(t)) return 'html'
  if (t.startsWith('&lt;') && /&lt;\/?[\w!]/.test(t)) return 'html'
  return 'text'
}

export type HighlightMode = 'auto' | 'json' | 'xml' | 'html' | 'javascript' | 'text'

export function highlight(body: string, contentType?: string, mode: HighlightMode = 'auto'): string {
  if (!body) return ''
  const lang = mode === 'auto' ? detectLang(body, contentType) : mode
  switch (lang) {
    case 'json':
      return isValidJson(body) ? highlightJson(body) : escapeHtml(body)
    case 'html':
    case 'xml': return highlightHtml(normalizeMarkupBody(body))
    case 'javascript': return highlightJavaScript(body)
    default: return escapeHtml(body)
  }
}
