import beautifier from 'js-beautify'

/**
 * Enhanced code formatter supporting multiple programming languages.
 */
export function formatCode(text: string, lang: string = 'auto'): string {
  if (!text || typeof text !== 'string') return text || ''

  const trimmed = text.trim()
  if (!trimmed) return text

  const baseOptions: beautifier.CoreBeautifyOptions = {
    indent_size: 2,
    indent_char: ' ',
    max_preserve_newlines: 2,
    preserve_newlines: true,
    end_with_newline: false,
    wrap_line_length: 0,
    indent_empty_lines: false
  }

  const jsOptions: beautifier.JSBeautifyOptions = {
    ...baseOptions,
    brace_style: 'collapse',
    keep_array_indentation: false,
    break_chained_methods: false,
    space_before_conditional: true,
    unescape_strings: false,
    jslint_happy: false,
    e4x: false,
    comma_first: false,
  }

  const htmlOptions: beautifier.HTMLBeautifyOptions = {
    ...baseOptions,
    indent_inner_html: false,
    indent_scripts: 'normal',
  }

  const cssOptions: beautifier.CSSBeautifyOptions = {
    ...baseOptions,
    newline_between_rules: true,
    selector_separator_newline: true,
  }

  const l = (lang || 'auto').toLowerCase()

  try {
    // 1. JSON (Strict)
    if (l === 'json' || (l === 'auto' && (trimmed.startsWith('{') || trimmed.startsWith('[')))) {
      try {
        const obj = JSON.parse(trimmed)
        return JSON.stringify(obj, null, 2)
      } catch (e) {
        if (l === 'json') return beautifier.js(text, jsOptions)
      }
    }

    // 2. Web Languages
    if (['html', 'xml', 'svg', 'vue'].includes(l)) {
      return beautifier.html(text, htmlOptions)
    }
    
    if (['css', 'scss', 'less'].includes(l)) {
      return beautifier.css(text, cssOptions)
    }

    if (['javascript', 'typescript', 'js', 'ts', 'jsx', 'tsx'].includes(l)) {
      return beautifier.js(text, jsOptions)
    }

    // 3. C-Style / Brace Languages
    if (['c', 'cpp', 'java', 'rust', 'go', 'cs', 'php', 'swift', 'kotlin'].includes(l)) {
      return beautifier.js(text, {
        ...jsOptions,
        brace_style: 'expand',
      })
    }

    // 4. SQL
    if (l === 'sql') {
      return formatSql(text)
    }

    // 5. YAML
    if (l === 'yaml' || l === 'yml') {
      return formatYaml(text)
    }

    // Heuristic detection
    if (l === 'auto') {
      if (trimmed.startsWith('<')) return beautifier.html(text, htmlOptions)
      if (text.includes('{') && text.includes('}')) return beautifier.js(text, jsOptions)
      if (text.includes('SELECT ') && text.includes(' FROM ')) return formatSql(text)
    }

  } catch (err) {
    console.warn('Formatting failed:', err)
  }

  return text
}

/**
 * Heuristically detects the programming language of a given text.
 */
export function detectLanguage(text: string): string {
  if (!text || typeof text !== 'string') return 'text'
  const trimmed = text.trim()
  if (!trimmed) return 'text'

  // 1. JSON
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      JSON.parse(trimmed)
      return 'json'
    } catch (e) {
      // Might be a sloppy JS object, continue to other checks
    }
  }

  // 2. HTML / XML / SVG
  if (trimmed.startsWith('<')) {
    if (trimmed.toLowerCase().startsWith('<!doctype html') || trimmed.toLowerCase().includes('<html')) return 'html'
    if (trimmed.toLowerCase().includes('<svg')) return 'svg'
    return 'xml'
  }

  // 3. SQL
  const sqlKeywords = ['SELECT', 'INSERT INTO', 'UPDATE', 'DELETE', 'CREATE TABLE', 'DROP TABLE', 'ALTER TABLE']
  if (sqlKeywords.some(key => new RegExp(`\\b${key}\\b`, 'i').test(trimmed))) {
    return 'sql'
  }

  // 4. YAML
  if (trimmed.includes(': ') && !trimmed.includes('{') && !trimmed.includes(';')) {
    // Very basic check for key-value pair style
    if (trimmed.startsWith('---') || /^\w+:\s/.test(trimmed)) return 'yaml'
  }

  // 5. CSS
  if (trimmed.includes('{') && trimmed.includes('}') && trimmed.includes(':') && trimmed.includes(';')) {
    // Check if it looks like CSS selectors
    if (/^[.#a-zA-Z*]/.test(trimmed) && !trimmed.includes('function') && !trimmed.includes('var ')) {
      return 'css'
    }
  }

  // 6. Programming Languages (Brace basics)
  if (trimmed.includes('{') && trimmed.includes('}')) {
    if (trimmed.includes('function') || trimmed.includes('const ') || trimmed.includes('let ') || trimmed.includes('=>')) return 'javascript'
    if (trimmed.includes('public class ') || trimmed.includes('System.out.println')) return 'java'
    if (trimmed.includes('#include <') || trimmed.includes('int main(')) return 'cpp'
    if (trimmed.includes('fmt.Print') || trimmed.includes('func ')) return 'go'
    if (trimmed.includes('pub fn ') || trimmed.includes('let mut ')) return 'rust'
    return 'javascript' // Default brace fallback
  }

  // 7. Python
  if (trimmed.includes('def ') || trimmed.includes('import ') || (trimmed.includes('if ') && trimmed.endsWith(':'))) {
    if (!trimmed.includes('{')) return 'python'
  }

  return 'text'
}

function formatSql(sql: string): string {
  const keywords = [
    'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'GROUP BY', 'ORDER BY', 
    'LIMIT', 'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 
    'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'ON', 'HAVING', 'UNION'
  ]
  
  let result = sql.replace(/\s+/g, ' ').trim()
  keywords.forEach(key => {
    const regex = new RegExp(`\\b${key}\\b`, 'gi')
    result = result.replace(regex, (match) => `\n${match.toUpperCase()}`)
  })
  
  return result
    .split('\n')
    .map(line => line.trim())
    .filter(line => line)
    .join('\n')
}

function formatYaml(text: string): string {
  return text
    .split(/\r?\n/)
    .map(line => line.replace(/\s+$/, ''))
    .join('\n')
    .trim()
}
