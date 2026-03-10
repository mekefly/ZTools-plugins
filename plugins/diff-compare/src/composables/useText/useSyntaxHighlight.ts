import { ref, computed } from 'vue'
import hljs from 'highlight.js'

export type DiffLineType = 'equal' | 'delete' | 'insert' | 'modify'

// 语言配置：value(用户选择) -> hljs(highlight.js用) / label(显示名称)
const LANGUAGES: { value: string; hljs: string; label: string }[] = [
  { value: 'json', hljs: 'json', label: 'JSON' },
  { value: 'yaml', hljs: 'yaml', label: 'YAML' },
  { value: 'yml', hljs: 'yaml', label: 'YAML' },
  { value: 'html', hljs: 'xml', label: 'HTML' },
  { value: 'xml', hljs: 'xml', label: 'XML' },
  { value: 'css', hljs: 'css', label: 'CSS' },
  { value: 'javascript', hljs: 'javascript', label: 'JavaScript' },
  { value: 'js', hljs: 'javascript', label: 'JavaScript' },
  { value: 'typescript', hljs: 'typescript', label: 'TypeScript' },
  { value: 'ts', hljs: 'typescript', label: 'TypeScript' },
  { value: 'python', hljs: 'python', label: 'Python' },
  { value: 'py', hljs: 'python', label: 'Python' },
  { value: 'c', hljs: 'c', label: 'C' },
  { value: 'cpp', hljs: 'cpp', label: 'C++' },
  { value: 'c++', hljs: 'cpp', label: 'C++' },
  { value: 'java', hljs: 'java', label: 'Java' },
  { value: 'rust', hljs: 'rust', label: 'Rust' },
  { value: 'rs', hljs: 'rust', label: 'Rust' },
  { value: 'go', hljs: 'go', label: 'Go' },
  { value: 'golang', hljs: 'go', label: 'Go' },
  { value: 'sql', hljs: 'sql', label: 'SQL' },
  { value: 'markdown', hljs: 'markdown', label: 'Markdown' },
  { value: 'md', hljs: 'markdown', label: 'Markdown' },
  { value: 'shell', hljs: 'bash', label: 'Shell' },
  { value: 'sh', hljs: 'bash', label: 'Shell' },
  { value: 'bash', hljs: 'bash', label: 'Shell' },
  { value: 'ruby', hljs: 'ruby', label: 'Ruby' },
  { value: 'rb', hljs: 'ruby', label: 'Ruby' },
  { value: 'php', hljs: 'php', label: 'PHP' },
  { value: 'swift', hljs: 'swift', label: 'Swift' },
  { value: 'kotlin', hljs: 'kotlin', label: 'Kotlin' },
  { value: 'cs', hljs: 'csharp', label: 'C#' },
  { value: 'csharp', hljs: 'csharp', label: 'C#' },
]

// 导出语言选项（去重 + 排序）
export const langOptions = computed(() => {
  const seen = new Set<string>()
  const options: { label: string; value: string }[] = [{ label: 'auto', value: 'auto' }]

  for (const lang of LANGUAGES) {
    if (!seen.has(lang.value)) {
      seen.add(lang.value)
      options.push({ label: lang.label, value: lang.value })
    }
  }

  return options.sort((a, b) => {
    if (a.value === 'auto') return -1
    if (b.value === 'auto') return 1
    return a.label.localeCompare(b.label)
  })
})

export function useSyntaxHighlight() {
  const highlightedSource = ref('')
  const highlightedTarget = ref('')
  const sourceLang = ref('')
  const targetLang = ref('')

  // 根据 value 查找 hljs 语言名
  const toHljsLang = (value: string): string | undefined => {
    const lang = LANGUAGES.find(l => l.value === value.toLowerCase())
    return lang?.hljs
  }

  const highlight = (code: string, lang: string): string => {
    if (!code) return ''
    if (!lang) return code

    const hljsLang = toHljsLang(lang)
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

  const highlightWithDiff = (code: string, lang: string, diffType?: DiffLineType): string => {
    if (!code) return ''

    let highlighted: string
    if (!lang) {
      highlighted = escapeHtml(code)
    } else {
      const hljsLang = toHljsLang(lang)
      if (!hljsLang) {
        highlighted = escapeHtml(code)
      } else {
        try {
          if (hljs.getLanguage(hljsLang)) {
            highlighted = hljs.highlight(code, { language: hljsLang }).value
          } else {
            highlighted = escapeHtml(code)
          }
        } catch (e) {
          console.warn('Highlight failed:', e)
          highlighted = escapeHtml(code)
        }
      }
    }

    // 始终应用差异高亮
    if (diffType === 'delete') {
      return `<span class="diff-line-delete">${highlighted}</span>`
    } else if (diffType === 'insert') {
      return `<span class="diff-line-insert">${highlighted}</span>`
    }
    return highlighted
  }

  const escapeHtml = (text: string): string => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
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
    highlightWithDiff,
    isSourceHighlighted,
    isTargetHighlighted,
    highlight,
  }
}