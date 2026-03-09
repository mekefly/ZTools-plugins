import { ref, computed } from 'vue'
import hljs from 'highlight.js'


const LANGUAGE_MAP: Record<string, string> = {
  json: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  html: 'xml',
  xml: 'xml',
  css: 'css',
  javascript: 'javascript',
  js: 'javascript',
  typescript: 'typescript',
  ts: 'typescript',
  python: 'python',
  py: 'python',
  c: 'c',
  cpp: 'cpp',
  'c++': 'cpp',
  java: 'java',
  rust: 'rust',
  rs: 'rust',
  go: 'go',
  golang: 'go',
  sql: 'sql',
  markdown: 'markdown',
  md: 'markdown',
  shell: 'bash',
  sh: 'bash',
  bash: 'bash',
  ruby: 'ruby',
  rb: 'ruby',
  php: 'php',
  swift: 'swift',
  kotlin: 'kotlin',
  cs: 'csharp',
  csharp: 'csharp',
}

export function useSyntaxHighlight() {
  const highlightedSource = ref('')
  const highlightedTarget = ref('')
  const sourceLang = ref('')
  const targetLang = ref('')

  const highlight = (code: string, lang: string): string => {
    if (!code) return ''
    if (!lang) return code

    const hljsLang = LANGUAGE_MAP[lang.toLowerCase()]
    if (!hljsLang) return code

    try {
      if (hljs.getLanguage(hljsLang)) {
        return hljs.highlight(code, { language: hljsLang }).value
      }
    } catch (e) {
      console.warn('Highlight failed:', e)
    }
    return code
  }

  const highlightSource = (code: string, lang: string) => {
    sourceLang.value = lang
    highlightedSource.value = highlight(code, lang)
  }

  const highlightTarget = (code: string, lang: string) => {
    targetLang.value = lang
    highlightedTarget.value = highlight(code, lang)
  }

  const isSourceHighlighted = computed(() => highlightedSource.value.length > 0)
  const isTargetHighlighted = computed(() => highlightedTarget.value.length > 0)

  return {
    highlightedSource,
    highlightedTarget,
    sourceLang,
    targetLang,
    highlightSource,
    highlightTarget,
    isSourceHighlighted,
    isTargetHighlighted,
    highlight,
  }
}