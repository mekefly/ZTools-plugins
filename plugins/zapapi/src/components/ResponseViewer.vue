<template>
  <div class="response-viewer">
    <div class="response-topbar">
      <div class="response-main-tabs">
        <button
          v-for="item in mainTabs"
          :key="item.key"
          type="button"
          class="response-main-tab"
          :class="{ 'response-main-tab--active': activeMainTab === item.key }"
          @click="activeMainTab = item.key"
        >
          {{ item.label }}
        </button>
      </div>
      <div class="response-topbar-right">
        <div v-if="response.status !== null" class="response-meta">
          <span class="meta-pill"><span class="meta-label">{{ t('response.statusLabel') }}</span><UiBadge :variant="statusVariant" size="sm">{{ response.status }} {{ response.statusText }}</UiBadge></span>
          <span class="meta-pill"><span class="meta-label">{{ t('response.timeLabel') }}</span>{{ response.time }}ms</span>
          <span class="meta-pill"><span class="meta-label">{{ t('response.sizeLabel') }}</span>{{ formatSize(response.size) }}</span>
        </div>
        <div class="response-topbar-actions">
          <UiButton variant="ghost" size="xs" @click="$emit('toggle-collapse')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
            {{ t('response.collapse') }}
          </UiButton>
        </div>
      </div>
    </div>

    <div class="response-content">
      <div v-if="sending" class="response-loading">
        <svg class="spinner" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12a9 9 0 11-6.219-8.56"/>
        </svg>
        <span>{{ t('response.waiting') }}</span>
      </div>
      <div v-else-if="response.error" class="response-error-body">
        <p>{{ t('response.failed') }}</p>
        <p>{{ response.error }}</p>
      </div>
      <UiEmpty v-else-if="response.status === null" :text="t('response.empty')" />
      <template v-else>
        <div v-if="activeMainTab === 'body'" class="body-panel">
          <div class="body-toolbar">
            <div class="toolbar-left">
              <UiSelect v-model="viewMode" :options="viewModeOptions" class="toolbar-select" />
              <button type="button" class="toolbar-btn" :class="{ 'toolbar-btn--active': showPreview }" @click="showPreview = !showPreview">
                <span class="toolbar-icon">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>
                </span>
                <span>{{ t('response.preview') }}</span>
              </button>
            </div>
            <div class="toolbar-right">
              <button type="button" class="toolbar-btn" :class="{ 'toolbar-btn--active': showFilterInput }" @click="showFilterInput = !showFilterInput">
                <span class="toolbar-icon">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="22 3 2 3 10 12 10 19 14 21 14 12 22 3"/></svg>
                </span>
                <span>{{ t('response.filter') }}</span>
              </button>
              <button type="button" class="toolbar-btn" :class="{ 'toolbar-btn--active': showSearchInput }" @click="showSearchInput = !showSearchInput">
                <span class="toolbar-icon">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                </span>
                <span>{{ t('response.search') }}</span>
              </button>
              <button type="button" class="toolbar-btn" @click="copyText(filteredDisplayText)">
                <span class="toolbar-icon">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                </span>
                <span>{{ t('response.copy') }}</span>
              </button>
            </div>
          </div>

          <div v-if="showFilterInput || showSearchInput" class="body-subtools">
            <UiInput v-if="showFilterInput" v-model="filterKeyword" :placeholder="t('response.filterPlaceholder')" class="toolbar-input" />
            <UiInput v-if="showSearchInput" v-model="searchKeyword" :placeholder="t('response.searchPlaceholder')" class="toolbar-input" />
          </div>

          <div class="body-content">
            <img v-if="showPreview && isImageContent && imagePreviewSrc" :src="imagePreviewSrc" :alt="t('response.imagePreview')" class="image-preview" />
            <pre v-else class="code-highlight" v-html="highlightedBody || escapeHtml(filteredDisplayText || t('response.emptyBody'))"></pre>
          </div>
        </div>

        <div v-if="activeMainTab === 'raw'" class="generic-panel">
          <pre class="code-highlight" v-html="highlightedRaw || escapeHtml(response.raw || response.body)"></pre>
        </div>

        <div v-if="activeMainTab === 'headers'" class="generic-panel headers-panel">
          <div v-for="(value, key) in response.headers" :key="key" class="header-row">
            <span class="header-key">{{ key }}</span>
            <span class="header-value">{{ value }}</span>
            <UiButton variant="ghost" size="xs" @click="copyText(`${key}: ${value}`)">{{ t('response.copyField') }}</UiButton>
          </div>
        </div>

        <div v-if="activeMainTab === 'cookies'" class="generic-panel headers-panel">
          <UiEmpty v-if="cookies.length === 0" :text="t('response.noCookies')" />
          <div v-for="cookie in cookies" :key="cookie" class="header-row">
            <span class="header-value">{{ cookie }}</span>
            <UiButton variant="ghost" size="xs" @click="copyText(cookie)">{{ t('response.copyField') }}</UiButton>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ResponseState } from '../store/request'
import UiBadge from './ui/UiBadge.vue'
import UiEmpty from './ui/UiEmpty.vue'
import UiButton from './ui/UiButton.vue'
import UiInput from './ui/UiInput.vue'
import UiSelect from './ui/UiSelect.vue'
import { highlight } from '../utils/syntaxHighlight'

const { t } = useI18n()

const props = defineProps<{
  response: ResponseState
  sending: boolean
}>()

defineEmits<{
  'toggle-collapse': []
}>()

const activeMainTab = ref<'body' | 'raw' | 'headers' | 'cookies'>('body')
const viewMode = ref<'json' | 'xml' | 'html' | 'javascript' | 'raw' | 'hex' | 'base64'>('json')
const showPreview = ref(false)
const searchKeyword = ref('')
const filterKeyword = ref('')
const showFilterInput = ref(false)
const showSearchInput = ref(false)

const mainTabs = computed(() => [
  { key: 'body' as const, label: t('response.body') },
  { key: 'raw' as const, label: t('response.raw') },
  { key: 'headers' as const, label: t('response.headers') },
  { key: 'cookies' as const, label: t('response.cookies') }
])

const viewModeOptions = computed(() => [
  {
    value: 'json' as const,
    label: t('response.modeJson'),
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 4H7a2 2 0 0 0-2 2v3a2 2 0 0 1-2 2 2 2 0 0 1 2 2v3a2 2 0 0 0 2 2h2"/><path d="M15 4h2a2 2 0 0 1 2 2v3a2 2 0 0 0 2 2 2 2 0 0 0-2 2v3a2 2 0 0 1-2 2h-2"/></svg>'
  },
  {
    value: 'xml' as const,
    label: t('response.modeXml'),
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>'
  },
  {
    value: 'html' as const,
    label: t('response.modeHtml'),
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 3h16l-2 14-6 4-6-4L4 3z"/><path d="M9 8h6M8.8 12h6.4M8.5 16h7"/></svg>'
  },
  {
    value: 'javascript' as const,
    label: t('response.modeJs'),
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3h12v18H6z"/><path d="M10 8v8"/><path d="M14 12v4a2 2 0 0 1-2 2"/></svg>'
  },
  {
    value: 'raw' as const,
    label: t('response.modeRaw'),
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="14" y2="17"/></svg>'
  },
  {
    value: 'hex' as const,
    label: t('response.modeHex'),
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 18h16M8 6v12M16 6v12"/></svg>'
  },
  {
    value: 'base64' as const,
    label: t('response.modeBase64'),
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="8" cy="12" r="3"/><circle cx="16" cy="12" r="3"/><line x1="11" y1="12" x2="13" y2="12"/></svg>'
  }
])

const statusVariant = computed(() => {
  const status = props.response.status
  if (!status) return 'info'
  if (status >= 200 && status < 300) return 'success'
  if (status >= 300 && status < 400) return 'warning'
  return 'error'
})

const isImageContent = computed(() => (props.response.contentType || '').startsWith('image/'))

const imagePreviewSrc = computed(() => {
  if (!props.response.base64Body || !isImageContent.value) {
    return ''
  }
  const contentType = props.response.contentType || 'image/png'
  return `data:${contentType};base64,${props.response.base64Body}`
})

const sourceBodyText = computed(() => props.response.body || props.response.raw || '')

const displayBodyText = computed(() => {
  const text = sourceBodyText.value
  if (!text) {
    return ''
  }

  if (viewMode.value === 'hex') {
    const bytes = new TextEncoder().encode(text)
    return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, '0')).join(' ')
  }

  if (viewMode.value === 'base64') {
    try {
      return btoa(unescape(encodeURIComponent(text)))
    } catch {
      return btoa(text)
    }
  }

  return text
})

const filteredDisplayText = computed(() => {
  const keyword = filterKeyword.value.trim()
  if (!keyword) {
    return displayBodyText.value
  }

  return displayBodyText.value
    .split('\n')
    .filter((line) => line.toLowerCase().includes(keyword.toLowerCase()))
    .join('\n')
})

const highlightedBody = computed(() => {
  const body = filteredDisplayText.value
  const syntaxMode: 'json' | 'xml' | 'html' | 'javascript' =
    viewMode.value === 'raw' || viewMode.value === 'hex' || viewMode.value === 'base64'
      ? 'json'
      : viewMode.value

  if (!searchKeyword.value.trim()) {
    return highlight(body, undefined, syntaxMode)
  }

  const escapedKeyword = searchKeyword.value.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  if (!escapedKeyword) {
    return highlight(body, undefined, syntaxMode)
  }

  const marked = body.replace(new RegExp(escapedKeyword, 'gi'), (m) => `__MARK__${m}__MARK__`)
  const highlighted = highlight(marked, undefined, syntaxMode)
  return highlighted.replace(/__MARK__(.*?)__MARK__/g, '<mark>$1</mark>')
})

const highlightedRaw = computed(() => {
  const contentType = props.response.headers?.['content-type'] || props.response.contentType || ''
  return highlight(props.response.raw || props.response.body || '', contentType, 'auto')
})

const cookies = computed(() => {
  return Object.entries(props.response.headers)
    .filter(([key]) => key.toLowerCase() === 'set-cookie')
    .flatMap(([, value]) => value.split(/\n|,(?=\s*[^;]+=[^;]+)/g).map((item) => item.trim()).filter(Boolean))
})

function formatSize(bytes: number | null): string {
  if (!bytes) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

async function copyText(value: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value)
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = value
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
  }
}
</script>

<style scoped>
.response-viewer {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.response-topbar {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: var(--space-sm);
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-surface);
  padding: 0 12px;
  flex-shrink: 0;
  min-height: 42px;
}

.response-main-tabs {
  display: flex;
  gap: 2px;
  height: 42px;
}

.response-main-tab {
  border: none;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  padding: 0 12px;
  cursor: pointer;
}

.response-main-tab:hover {
  color: var(--text-primary);
}

.response-main-tab--active {
  color: var(--accent-primary);
  border-bottom-color: var(--accent-primary);
}

.response-meta {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.response-topbar-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.response-topbar-actions {
  display: flex;
  align-items: center;
}

.meta-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  background: var(--bg-elevated);
  font-size: 11px;
  color: var(--text-secondary);
  font-family: 'JetBrains Mono', 'SF Mono', monospace;
}

.meta-label {
  font-family: inherit;
  color: var(--text-muted);
}

.response-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.body-panel,
.generic-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.body-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-md);
  padding: 7px 12px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-surface);
  flex-shrink: 0;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.toolbar-left .toolbar-btn {
  margin-left: 4px;
}

.toolbar-btn {
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-secondary);
  font-size: 11px;
  padding: 5px 7px;
  border-radius: var(--radius-sm);
  display: inline-flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
}

.toolbar-btn:hover {
  background: var(--bg-elevated);
  color: var(--text-primary);
}

.toolbar-btn--active {
  color: var(--text-primary);
  border-color: var(--border-color);
  background: var(--bg-elevated);
  box-shadow: none;
}

.toolbar-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  font-size: 10px;
  font-weight: 700;
}

.toolbar-input {
  width: 220px;
}

.body-subtools {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-color);
  background: var(--panel-bg);
  flex-shrink: 0;
}

.body-content,
.headers-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow-y: auto;
  padding: 10px 12px;
}

.code-highlight {
  flex: 1;
  min-height: 100%;
  margin: 0;
  padding: 10px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  background: var(--code-bg);
  font-size: 12px;
  line-height: 1.55;
  font-family: 'JetBrains Mono', 'SF Mono', monospace;
  white-space: pre-wrap;
  word-break: break-word;
  box-sizing: border-box;
  overflow-x: hidden;
}

.code-highlight :deep(mark) {
  background: rgba(255, 184, 0, 0.2);
  color: var(--warning-color);
  border-radius: 2px;
}

.header-row {
  display: flex;
  align-items: flex-start;
  gap: var(--space-sm);
  padding: 6px 8px;
  border-radius: var(--radius-sm);
}

.header-row:hover {
  background: var(--bg-surface);
}

.header-key {
  min-width: 160px;
  color: var(--accent-primary);
  font-family: 'JetBrains Mono', 'SF Mono', monospace;
  font-size: 12px;
}

.header-value {
  flex: 1;
  min-width: 0;
  word-break: break-word;
  color: var(--text-primary);
  font-family: 'JetBrains Mono', 'SF Mono', monospace;
  font-size: 12px;
}

.response-loading {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-md);
  color: var(--text-secondary);
}

.spinner {
  animation: spin 0.8s linear infinite;
  color: var(--accent-primary);
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.response-error-body {
  flex: 1;
  height: 100%;
  width: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-xs);
  padding: var(--space-lg);
  color: var(--error-color);
  text-align: center;
}

.response-error-body p {
  margin: 0;
}

.image-preview {
  max-width: 100%;
  max-height: 320px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
}
</style>
