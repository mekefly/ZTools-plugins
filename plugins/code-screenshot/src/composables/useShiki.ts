import { ref, shallowRef, watch } from 'vue'
import { createHighlighter, type HighlighterCore } from 'shiki'
import { state, SUPPORTED_LANGUAGES, detectLanguage, LANGUAGE_ALIASES } from '../store'

export function useShiki() {
  const highlighter = shallowRef<HighlighterCore | null>(null)
  const isLoaded = ref(false)
  const highlightedHtml = ref('')

  const initShiki = async () => {
    isLoaded.value = false
    try {
      const langs = SUPPORTED_LANGUAGES.filter(l => l.id !== 'auto').map(l => l.id)
      highlighter.value = await createHighlighter({
        themes: ['github-dark', 'github-light'],
        langs: langs,
      })
      isLoaded.value = true
      updateHighlight()
    } catch (e) {
      console.error('Failed to init Shiki:', e)
    }
  }

  const updateHighlight = () => {
    if (!highlighter.value || !isLoaded.value) {
      highlightedHtml.value = escapeHtml(state.code)
      return
    }

    let lang = state.language

    // Auto-detect language
    if (lang === 'auto' || !lang) {
      const detected = detectLanguage(state.code)
      if (detected && SUPPORTED_LANGUAGES.some(l => l.id === detected)) {
        lang = detected
      } else if (detected && LANGUAGE_ALIASES[detected]) {
        lang = LANGUAGE_ALIASES[detected]
      } else {
        lang = 'text'
      }
    }

    // Fallback to text if language is not supported
    if (!SUPPORTED_LANGUAGES.some(l => l.id === lang && l.id !== 'auto')) {
      lang = 'text'
    }

    try {
      const html = highlighter.value.codeToHtml(state.code || ' ', {
        lang: lang,
        theme: state.theme
      })
      highlightedHtml.value = html
    } catch (e) {
      console.error('Highlight failed:', e)
      highlightedHtml.value = escapeHtml(state.code)
    }
  }

  const escapeHtml = (unsafe: string) => {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  initShiki()

  watch([() => state.code, () => state.language, () => state.theme], () => {
    updateHighlight()
  })

  return {
    isLoaded,
    highlightedHtml
  }
}
