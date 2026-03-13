<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { toPng, toSvg } from 'html-to-image'
import CodeWindow from '@/components/CodeWindow.vue'
import Toolbar from '@/components/Toolbar.vue'
import { Info, ChevronDown, Download, FileCode2, ImageDown, FileType2, Clipboard, Check } from 'lucide-vue-next'
import { state, SUPPORTED_LANGUAGES, LANGUAGE_ALIASES, detectLanguage } from '@/store'
import CsButton from '@/libs/components/CsButton.vue'
import AboutModal from '@/components/AboutModal.vue'
import CsToastProvider from '@/libs/components/CsToastProvider.vue'
import { useToast } from '@/libs/toast'

const toast = useToast()
const showAbout = ref(false)
const isDraggingFile = ref(false)
const showExportMenu = ref(false)
const copyDone = ref(false)
const exportMenuRef = ref<HTMLElement | null>(null)

watch(() => state.darkMode, (isDark) => {
  if (isDark) {
    document.documentElement.classList.remove('light-theme')
  } else {
    document.documentElement.classList.add('light-theme')
  }
}, { immediate: true })

const handleDragOver = (e: DragEvent) => {
  e.preventDefault()
  if (e.dataTransfer?.types.includes('Files')) {
    isDraggingFile.value = true
  }
}

const handleDragLeave = (e: DragEvent) => {
  e.preventDefault()
  // Ensure we are actually leaving the window
  if (!e.relatedTarget || (e.relatedTarget as HTMLElement).nodeName === 'HTML') {
    isDraggingFile.value = false
  }
}

const handleDrop = async (e: DragEvent) => {
  e.preventDefault()
  isDraggingFile.value = false

  const file = e.dataTransfer?.files[0]
  if (!file) return

  try {
    const text = await file.text()
    state.code = text
    state.filename = file.name

    // Attempt language detection from extension
    const extMatch = file.name.match(/\.([^.]+)$/)
    let languageSet = false
    if (extMatch) {
      const ext = extMatch[1].toLowerCase()

      const extMap: Record<string, string> = {
        'ts': 'typescript', 'tsx': 'typescript',
        'js': 'javascript', 'jsx': 'javascript', 'mjs': 'javascript', 'cjs': 'javascript',
        'vue': 'vue',
        'html': 'html', 'htm': 'html',
        'css': 'css', 'scss': 'scss', 'sass': 'scss', 'less': 'css',
        'java': 'java',
        'py': 'python',
        'cpp': 'cpp', 'cxx': 'cpp', 'cc': 'cpp', 'c': 'cpp', 'h': 'cpp', 'hpp': 'cpp', 'c++': 'cpp',
        'go': 'go',
        'rs': 'rust',
        'json': 'json', 'jsonc': 'json', 'json5': 'json',
        'sql': 'sql',
        'md': 'markdown', 'mdx': 'markdown',
        'rb': 'ruby',
        'php': 'php',
        'swift': 'swift',
        'kt': 'kotlin', 'kts': 'kotlin',
        'cs': 'csharp',
        'scala': 'scala',
        'sh': 'bash', 'bash': 'bash', 'zsh': 'bash',
        'ps1': 'powershell', 'psm1': 'powershell',
        'dockerfile': 'dockerfile',
        'yml': 'yaml', 'yaml': 'yaml',
        'xml': 'xml',
        'graphql': 'graphql', 'gql': 'graphql',
        'svelte': 'svelte',
        'dart': 'dart',
        'ex': 'elixir', 'exs': 'elixir',
        'erl': 'erlang',
        'hs': 'haskell',
        'lua': 'lua',
        'pl': 'perl', 'pm': 'perl',
        'r': 'r',
        'jl': 'julia',
        'm': 'matlab',
        'gradle': 'gradle',
        'toml': 'toml',
        'ini': 'ini',
        'diff': 'diff', 'patch': 'diff',
        'cfg': 'nginx', 'conf': 'nginx',
      }

      const mappedLangId = extMap[ext] || LANGUAGE_ALIASES[ext]
      if (mappedLangId && SUPPORTED_LANGUAGES.some(lang => lang.id === mappedLangId)) {
        state.language = mappedLangId
        languageSet = true
      }
    }

    // Auto-detect language if set to auto or no language was detected from extension
    if (state.language === 'auto' || !languageSet) {
      const detected = detectLanguage(text)
      if (detected && SUPPORTED_LANGUAGES.some(lang => lang.id === detected)) {
        state.language = detected
      } else if (detected && LANGUAGE_ALIASES[detected]) {
        state.language = LANGUAGE_ALIASES[detected]
      } else if (state.language !== 'auto') {
        // Keep the manually selected language if not auto
      } else {
        state.language = 'plaintext'
      }
    }
  } catch (err) {
    console.error('Failed to read dragged file:', err)
    toast.error('读取失败，请重试')
  }
}

const handleExport = async (format: 'png' | 'svg') => {
  showExportMenu.value = false
  const node = document.querySelector('.export-target') as HTMLElement
  if (!node) return

  try {
    const scale = 3 // High resolution
    let dataUrl = ''

    // Ensure styles are correctly applied before capture
    if (format === 'png') {
      dataUrl = await toPng(node, {
        pixelRatio: scale,
        skipFonts: true,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left'
        }
      })
    } else {
      dataUrl = await toSvg(node)
    }

    const link = document.createElement('a')
    const defaultFilename = 'Untitled.ts'
    const fileName = state.filename && state.filename !== defaultFilename
      ? `${state.filename.replace(/\.[^.]+$/, '')}-code-snippet`
      : 'code-snippet'
    link.download = `${fileName}.${format}`
    link.href = dataUrl
    link.click()
  } catch (err) {
    console.error('Export failed', err)
    toast.error('导出失败，请重试')
  }
}

const copyToClipboard = async () => {
  showExportMenu.value = false
  const node = document.querySelector('.export-target') as HTMLElement
  if (!node) return

  try {
    const dataUrl = await toPng(node, {
      pixelRatio: 3,
      skipFonts: true,
    })
    // Convert dataUrl to Blob
    if (window.ztools) {
      window.ztools.copyImage(dataUrl)
    } else {
      const res = await fetch(dataUrl)
      const blob = await res.blob()
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ])
    }
    toast.success('已复制到剪贴板')
    copyDone.value = true
    setTimeout(() => { copyDone.value = false }, 2000)
  } catch (err) {
    console.error('Copy failed', err)
    toast.error('复制失败，请尝试使用导出功能')
  }
}

const closeExportMenu = (e: MouseEvent) => {
  if (exportMenuRef.value && !exportMenuRef.value.contains(e.target as Node)) {
    showExportMenu.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', closeExportMenu)
  if (window.ztools) {
    window.ztools.onPluginEnter((action: any) => {
    })
    window.ztools.onPluginOut(() => {
    })
  }
})

onUnmounted(() => {
  document.removeEventListener('click', closeExportMenu)
})
</script>

<template>
  <div class="app-viewport" @dragover="handleDragOver" @dragleave="handleDragLeave" @drop="handleDrop">
    <CsToastProvider />

    <!-- Drag Overlay -->
    <Transition name="fade">
      <div v-if="isDraggingFile" class="drag-overlay">
        <div class="drag-content">
          <FileCode2 :size="64" class="drag-icon" />
          <h2>松开以载入代码片段</h2>
        </div>
      </div>
    </Transition>

    <!-- Top Global Header -->
    <header class="global-header">
      <div class="header-right">
        <!-- About Button -->
        <CsButton variant="secondary" size="sm" @click="showAbout = true">
          <Info :size="15" />
          <span>关于</span>
        </CsButton>

        <!-- Export Button Combo -->
        <div class="export-combo-btn" ref="exportMenuRef">
          <CsButton class="btn-export-inner" variant="danger" size="sm" @click="handleExport('png')">
            <Download :size="15" />
            <span>导出图片</span>
          </CsButton>
          <div class="btn-export-divider"></div>
          <CsButton class="btn-export-drop-inner" :class="{ 'menu-open': showExportMenu }" variant="danger" size="sm"
            :icon-only="true" @click.stop="showExportMenu = !showExportMenu">
            <ChevronDown :size="15" class="drop-chevron" :class="{ 'rotated': showExportMenu }" />
          </CsButton>

          <!-- Export Format Dropdown Menu -->
          <Transition name="export-menu">
            <div v-if="showExportMenu" class="export-menu">
              <div class="export-menu-header">选择格式</div>
              <button class="export-menu-item" @click="handleExport('png')">
                <ImageDown :size="15" />
                <div class="export-menu-item-text">
                  <span class="item-label">PNG 图片</span>
                  <span class="item-desc">高清三倍速退，最小体积</span>
                </div>
              </button>
              <button class="export-menu-item" @click="handleExport('svg')">
                <FileType2 :size="15" />
                <div class="export-menu-item-text">
                  <span class="item-label">SVG 矢量图</span>
                  <span class="item-desc">无限缩放，适合打印展示</span>
                </div>
              </button>
              <div class="export-menu-divider"></div>
              <button class="export-menu-item" @click="copyToClipboard">
                <Check v-if="copyDone" :size="15" class="copy-check" />
                <Clipboard v-else :size="15" />
                <div class="export-menu-item-text">
                  <span class="item-label">{{ copyDone ? '已复制到剪贴板' : '复制到剪贴板' }}</span>
                  <span class="item-desc">直接粘贴到其他应用</span>
                </div>
              </button>
            </div>
          </Transition>
        </div>
      </div>
    </header>

    <!-- Main Workspace -->
    <div class="main-workspace">
      <div class="workspace-center">
        <CodeWindow />
      </div>
    </div>

    <!-- Fixed Floating Toolbar -->
    <Toolbar class="fixed-toolbar" />

    <!-- About Modal -->
    <AboutModal :show="showAbout" @close="showAbout = false" />
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.app-viewport {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--color-bg);
  overflow: hidden;
  position: relative;
  transition: background-color var(--transition-base);
}

.global-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: $spacing-3xl $spacing-4xl;
  display: flex;
  justify-content: flex-end;
  z-index: $z-fixed;
  pointer-events: none;
}

.header-right {
  display: flex;
  align-items: center;
  gap: $spacing-3xl;
  pointer-events: auto;
}

/* Export Combo: wrap CsButtons in one unified dark-red container */
.export-combo-btn {
  display: flex;
  align-items: center;
  position: relative;
  /* Anchor for the export dropdown menu */
  background-color: var(--color-btn-bg);
  border: 1px solid var(--color-btn-border);
  border-radius: var(--radius-lg);
  overflow: visible;
  /* Allow menu to overflow the rounded container */
  transition: background-color var(--transition-base), border-color var(--transition-base);

  &:hover {
    background-color: var(--color-btn-hover);
    border-color: rgba(255, 60, 60, 0.3);
  }

  /* Override CsButton inner styles to work within the combo */
  .btn-export-inner,
  .btn-export-drop-inner {
    background: transparent !important;
    border: none !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    color: var(--color-primary) !important;

    &:hover:not(.is-disabled) {
      background: var(--color-btn-hover) !important;
    }

    &:active:not(.is-disabled) {
      transform: none !important;
      background: rgba(0, 0, 0, 0.1) !important;
    }
  }

  .btn-export-inner {
    padding-left: var(--spacing-md);
    padding-right: var(--spacing-lg);
    font-size: var(--spacing-md);
    font-weight: 500;
    border-radius: var(--radius-lg) 0 0 var(--radius-lg) !important;
    /* Clip left side */
  }

  .btn-export-drop-inner {
    width: 32px;
    border-radius: 0 var(--radius-lg) var(--radius-lg) 0 !important;
    /* Clip right side */

    .drop-chevron {
      transition: transform var(--transition-bounce);

      &.rotated {
        transform: rotate(180deg);
      }
    }
  }
}

/* Export Dropdown Menu */
.export-menu {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  width: 220px;
  background: var(--color-dropdown-bg);
  backdrop-filter: blur(24px);
  border: 1px solid var(--color-dropdown-border);
  border-radius: var(--radius-xl);
  padding: 8px;
  box-shadow: var(--shadow-2xl), inset 0 1px 0 rgba(255, 255, 255, 0.05);
  z-index: var(--z-dropdown);
  transition: background-color var(--transition-base), border-color var(--transition-base);

  &-header {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted-darker);
    font-weight: 600;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    padding: 4px var(--spacing-sm) 8px;
  }

  &-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    background: transparent;
    border: none;
    border-radius: var(--radius-lg);
    padding: 9px var(--spacing-sm);
    cursor: pointer;
    color: var(--color-text-muted);
    transition: all var(--transition-fast);
    text-align: left;

    &:hover {
      background: rgba(255, 255, 255, 0.05);
      color: var(--color-text);

      .item-label {
        color: var(--color-text);
      }
    }

    &-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
  }

  &-divider {
    height: 1px;
    background: rgba(255, 255, 255, 0.06);
    margin: 4px 0;
  }
}

.item-label {
  font-size: var(--font-size-base);
  font-weight: 500;
  color: var(--color-text-light);
  transition: color var(--transition-fast);
}

.item-desc {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted-darker);
  line-height: 1.3;
}

.copy-check {
  color: #4ade80;
  /* green-400 */
}

/* Export Menu Transition */
.export-menu-enter-active,
.export-menu-leave-active {
  transition: opacity 0.2s ease, transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.export-menu-enter-from,
.export-menu-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.97);
}

.btn-export-divider {
  width: 1px;
  height: 16px;
  flex-shrink: 0;
  background-color: rgba(251, 113, 133, 0.2);
}

.main-workspace {
  position: relative;
  width: 100%;
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
}

.workspace-center {
  margin: auto;
  padding: 100px var(--spacing-2xl) 140px var(--spacing-2xl);
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
}

.drag {
  &-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--color-modal-overlay);
    backdrop-filter: blur(10px);
    z-index: 2000;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    transition: background-color var(--transition-base);
  }

  &-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
    color: var(--color-text);
    border: 2px dashed rgba(255, 255, 255, 0.2);
    padding: var(--spacing-5xl) 128px;
    border-radius: 24px;
    background: rgba(255, 255, 255, 0.02);
    animation: pulse-border 2s infinite ease-in-out;

    h2 {
      font-size: var(--font-size-2xl);
      font-weight: 500;
      margin: 0;
      letter-spacing: 1px;
    }
  }

  &-icon {
    color: var(--color-accent-blue);
    filter: var(--shadow-glow-blue);
  }
}
</style>
