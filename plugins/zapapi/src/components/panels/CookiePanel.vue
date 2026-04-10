<template>
  <div class="cookie-panel">
    <div class="cookie-panel__toolbar">
      <UiInput v-model="keyword" :placeholder="t('cookies.searchPlaceholder')" class="cookie-panel__search" />
      <UiButton variant="ghost" size="xs" @click="refreshCookies">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
        </svg>
      </UiButton>
    </div>

    <UiEmpty v-if="filteredCookies.length === 0" :text="t('cookies.empty')" />

    <div v-else class="cookie-panel__list">
      <div v-for="group in groupedCookies" :key="group.domain" class="cookie-domain-group">
        <div class="cookie-domain-group__header" @click="toggleGroup(group.domain)">
          <svg class="cookie-domain-group__toggle" :class="{ 'cookie-domain-group__toggle--expanded': expandedGroups.has(group.domain) }" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
          <span class="cookie-domain-group__domain">{{ group.domain }}</span>
          <UiBadge size="sm" variant="info">{{ group.items.length }}</UiBadge>
          <UiButton variant="ghost" size="xs" @click.stop="clearDomain(group.domain)">{{ t('cookies.clearDomain') }}</UiButton>
        </div>

        <div v-show="expandedGroups.has(group.domain)" v-for="item in group.items" :key="item.id" class="cookie-row">
          <div class="cookie-row__main" @click="toggleExpand(item.id)">
            <div class="cookie-row__name">
              {{ item.name }}
              <UiBadge v-if="item.sameSite" size="sm" :variant="sameSiteVariant(item.sameSite)">{{ item.sameSite }}</UiBadge>
            </div>
            <div class="cookie-row__value" :class="{ 'cookie-row__value--expanded': expandedIds.has(item.id) }">
              {{ expandedIds.has(item.id) ? item.value : item.value.slice(0, 40) + (item.value.length > 40 ? '...' : '') }}
            </div>
          </div>
          <div class="cookie-row__meta">
            <span>{{ item.path }}</span>
            <UiBadge v-if="item.secure" size="sm" variant="warning">Secure</UiBadge>
            <UiBadge v-if="item.httpOnly" size="sm" variant="info">HttpOnly</UiBadge>
          </div>
          <div class="cookie-row__actions">
            <UiTooltip :content="t('cookies.copy')" placement="top">
              <UiButton variant="ghost" size="xs" icon-only @click="copyCookie(item)">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                </svg>
              </UiButton>
            </UiTooltip>
            <UiTooltip :content="t('common.delete')" placement="top">
              <UiButton variant="ghost" size="xs" icon-only @click="removeCookie(item.id)">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                </svg>
              </UiButton>
            </UiTooltip>
          </div>
        </div>
      </div>
    </div>

    <div class="cookie-panel__footer">
      <UiButton variant="danger" size="xs" :disabled="cookies.length === 0" @click="confirmClearAll = true">
        {{ t('cookies.clearAll') }}
      </UiButton>
    </div>

    <UiConfirm
      v-if="confirmClearAll"
      :title="t('cookies.clearAll')"
      :message="t('cookies.clearAllConfirm')"
      :confirm-text="t('common.delete')"
      :cancel-text="t('common.cancel')"
      confirm-variant="danger"
      @confirm="clearAll"
      @cancel="confirmClearAll = false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import UiButton from '../ui/UiButton.vue'
import UiInput from '../ui/UiInput.vue'
import UiEmpty from '../ui/UiEmpty.vue'
import UiBadge from '../ui/UiBadge.vue'
import UiConfirm from '../ui/UiConfirm.vue'
import UiTooltip from '../ui/UiTooltip.vue'

interface CookieItem {
  id: string
  name: string
  value: string
  domain: string
  path: string
  secure: boolean
  httpOnly: boolean
  sameSite: string
  expiresAt: number | null
}

const { t } = useI18n()
const keyword = ref('')
const cookies = ref<CookieItem[]>([])
const confirmClearAll = ref(false)
const expandedIds = ref(new Set<string>())
const expandedGroups = ref(new Set<string>())

function refreshCookies() {
  if (!window.services?.cookiesList) {
    cookies.value = []
    return
  }
  cookies.value = window.services.cookiesList() as CookieItem[]
}

function removeCookie(id: string) {
  window.services?.cookiesDelete?.(id)
  refreshCookies()
}

function clearDomain(domain: string) {
  window.services?.cookiesClear?.(domain)
  refreshCookies()
}

function clearAll() {
  window.services?.cookiesClear?.()
  confirmClearAll.value = false
  refreshCookies()
}

function toggleExpand(id: string) {
  const newSet = new Set(expandedIds.value)
  if (newSet.has(id)) {
    newSet.delete(id)
  } else {
    newSet.add(id)
  }
  expandedIds.value = newSet
}

function toggleGroup(domain: string) {
  const newSet = new Set(expandedGroups.value)
  if (newSet.has(domain)) {
    newSet.delete(domain)
  } else {
    newSet.add(domain)
  }
  expandedGroups.value = newSet
}

function copyCookie(item: CookieItem) {
  const text = `${item.name}=${item.value}`
  navigator.clipboard.writeText(text)
}

function sameSiteVariant(sameSite: string): 'success' | 'warning' | 'info' {
  if (sameSite === 'Strict') return 'success'
  if (sameSite === 'Lax') return 'info'
  return 'warning'
}

const filteredCookies = computed(() => {
  const term = keyword.value.trim().toLowerCase()
  if (!term) {
    return cookies.value
  }

  return cookies.value.filter((item) => {
    return (
      item.domain.toLowerCase().includes(term) ||
      item.name.toLowerCase().includes(term) ||
      item.value.toLowerCase().includes(term) ||
      item.path.toLowerCase().includes(term)
    )
  })
})

const groupedCookies = computed(() => {
  const grouped = new Map<string, CookieItem[]>()
  for (const item of filteredCookies.value) {
    const bucket = grouped.get(item.domain) || []
    bucket.push(item)
    grouped.set(item.domain, bucket)
  }

  return Array.from(grouped.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([domain, items]) => ({ domain, items }))
})

refreshCookies()

defineExpose({ refreshCookies })
</script>

<style scoped>
.cookie-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.cookie-panel__toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: var(--space-sm) var(--space-sm);
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.cookie-panel__search {
  flex: 1;
}

.cookie-panel__list {
  flex: 1;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: var(--space-xs);
}

.cookie-panel__footer {
  display: flex;
  justify-content: flex-end;
  padding: var(--space-xs) var(--space-sm);
  border-top: 1px solid var(--border-color);
  flex-shrink: 0;
}

.cookie-domain-group {
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.cookie-domain-group__header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-color);
  cursor: pointer;
  font-size: 11px;
}

.cookie-domain-group__toggle {
  transition: transform var(--transition-fast);
  flex-shrink: 0;
}

.cookie-domain-group__toggle--expanded {
  transform: rotate(90deg);
}

.cookie-domain-group__domain {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-primary);
}

.cookie-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px 8px;
  border-top: 1px solid var(--border-color);
}

.cookie-row:first-of-type {
  border-top: none;
}

.cookie-row__main {
  min-width: 0;
  cursor: pointer;
}

.cookie-row__name {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 4px;
}

.cookie-row__value {
  font-size: 10px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}

.cookie-row__value--expanded {
  white-space: pre-wrap;
  word-break: break-all;
}

.cookie-row__meta {
  display: flex;
  gap: 4px;
  font-size: 10px;
  color: var(--text-muted);
  align-items: center;
  flex-wrap: wrap;
}

.cookie-row__actions {
  display: flex;
  gap: 2px;
}
</style>
