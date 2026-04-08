<template>
  <div ref="tabsRootRef" class="request-tabs">
    <UiButton
      v-if="isOverflowing"
      variant="ghost"
      size="sm"
      icon-only
      class="request-tabs__nav"
      :disabled="!canScrollLeft"
      :aria-label="t('tabs.scrollLeft')"
      @click="scrollTabsBy(-1)"
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <polyline points="15 18 9 12 15 6"/>
      </svg>
    </UiButton>

    <div ref="tabsListRef" class="request-tabs__list" @scroll="updateScrollState" @wheel.prevent="onTabsWheel">
      <div ref="tabsTrackRef" class="request-tabs__track">
        <div
          v-for="tab in props.tabs"
        :key="tab.id"
        role="button"
        tabindex="0"
        class="request-tabs__item"
        :class="{ 'request-tabs__item--active': tab.id === props.activeTabId }"
        @click="emit('select', tab.id)"
        @keydown.enter="emit('select', tab.id)"
        @dblclick="openRenameDialog(tab.id, tab.title)"
        @contextmenu.prevent="openContextMenu($event, tab.id)"
        >
          <span class="request-tabs__method" :class="tab.method.toLowerCase()">{{ tab.method }}</span>
          <span class="request-tabs__title">{{ tab.title }}</span>
          <UiButton
            variant="ghost"
            size="xs"
            icon-only
            class="request-tabs__close"
            @click.stop="emit('close', tab.id)"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </UiButton>
        </div>
      </div>
      <UiTooltip v-if="!isOverflowing" :content="t('tabs.newTab')" placement="bottom">
        <span ref="inlineNewButtonRef" class="request-tabs__new-wrap">
          <UiButton variant="ghost" size="sm" icon-only class="request-tabs__new" @click="emit('new')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </UiButton>
        </span>
      </UiTooltip>
    </div>

    <UiButton
      v-if="isOverflowing"
      variant="ghost"
      size="sm"
      icon-only
      class="request-tabs__nav"
      :disabled="!canScrollRight"
      :aria-label="t('tabs.scrollRight')"
      @click="scrollTabsBy(1)"
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </UiButton>

    <UiTooltip v-if="isOverflowing" :content="t('tabs.newTab')" placement="bottom">
      <span ref="fixedNewButtonRef" class="request-tabs__new-fixed">
        <UiButton variant="ghost" size="sm" icon-only class="request-tabs__new" @click="emit('new')">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </UiButton>
      </span>
    </UiTooltip>

    <Teleport to="body">
      <div
        v-if="contextMenu.visible"
        class="request-tabs__context-overlay"
        @click="closeContextMenu"
        @contextmenu.prevent="closeContextMenu"
      >
        <div
          class="request-tabs__context-menu"
          :style="contextMenuStyle"
          @click.stop
          @contextmenu.prevent
        >
          <button type="button" class="request-tabs__context-item" @click="runMenuAction('close')">
            {{ t('tabs.closeCurrent') }}
          </button>
          <button type="button" class="request-tabs__context-item" @click="runMenuAction('closeOthers')">
            {{ t('tabs.closeOthers') }}
          </button>
          <button type="button" class="request-tabs__context-item" @click="runMenuAction('closeRight')">
            {{ t('tabs.closeRight') }}
          </button>
          <div class="request-tabs__context-divider"></div>
          <button type="button" class="request-tabs__context-item" @click="runMenuAction('duplicate')">
            {{ t('tabs.duplicate') }}
          </button>
        </div>
      </div>

      <div v-if="showRenameDialog" class="request-tabs__rename-overlay" @click="closeRenameDialog">
        <div
          class="request-tabs__rename-dialog"
          :style="renameDialogStyle"
          @click.stop
          @mousedown.stop
        >
          <div class="request-tabs__rename-header" @mousedown="startDragDialog">
            <h3 class="request-tabs__rename-title">{{ t('tabs.renameTitle') }}</h3>
            <UiButton variant="ghost" size="xs" icon-only @click="closeRenameDialog">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </UiButton>
          </div>
          <div class="request-tabs__rename-body">
            <UiInput
              ref="renameInputRef"
              v-model="renameValue"
              :placeholder="t('tabs.renamePlaceholder')"
              @keydown.enter="confirmRename"
            />
            <div class="request-tabs__rename-actions">
              <UiButton variant="ghost" size="sm" @click="closeRenameDialog">{{ t('common.cancel') }}</UiButton>
              <UiButton variant="primary" size="sm" @click="confirmRename">{{ t('common.save') }}</UiButton>
            </div>
          </div>
          <button
            type="button"
            class="request-tabs__resize-handle"
            :aria-label="t('tabs.resizeDialog')"
            @mousedown.stop.prevent="startResizeDialog"
          ></button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { ref, computed, watch, nextTick, onBeforeUnmount, onMounted } from 'vue'
import UiButton from './ui/UiButton.vue'
import UiTooltip from './ui/UiTooltip.vue'
import UiInput from './ui/UiInput.vue'

interface RequestTabItem {
  id: string
  title: string
  method: string
}

type ContextAction = 'close' | 'closeOthers' | 'closeRight' | 'duplicate'

const props = defineProps<{
  tabs: RequestTabItem[]
  activeTabId: string
}>()

const { t } = useI18n()

const showRenameDialog = ref(false)
const renameTabId = ref('')
const renameValue = ref('')
const renameInputRef = ref<{
  focus: () => void
  select: () => void
  focusAndSelect: () => void
} | null>(null)

const DIALOG_STATE_KEY = 'zapapi_request_tab_rename_dialog'
const DIALOG_MIN_WIDTH = 320
const DIALOG_MAX_WIDTH = 760
const DIALOG_HEIGHT = 180

const dialogLeft = ref(0)
const dialogTop = ref(0)
const dialogWidth = ref(420)

const isDragging = ref(false)
const isResizing = ref(false)
const dragOffsetX = ref(0)
const dragOffsetY = ref(0)
const resizeStartX = ref(0)
const resizeStartWidth = ref(420)

const tabsRootRef = ref<HTMLElement | null>(null)
const tabsListRef = ref<HTMLElement | null>(null)
const tabsTrackRef = ref<HTMLElement | null>(null)
const inlineNewButtonRef = ref<HTMLElement | null>(null)
const fixedNewButtonRef = ref<HTMLElement | null>(null)
const isOverflowing = ref(false)
const canScrollLeft = ref(false)
const canScrollRight = ref(false)
const measuredNewButtonWidth = ref(34)
const previousTabsCount = ref(props.tabs.length)
const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  tabId: ''
})

let resizeObserver: ResizeObserver | null = null

const emit = defineEmits<{
  select: [tabId: string]
  close: [tabId: string]
  closeOthers: [tabId: string]
  closeRight: [tabId: string]
  duplicate: [tabId: string]
  new: []
  rename: [tabId: string, title: string]
}>()

const contextMenuStyle = computed(() => ({
  left: `${contextMenu.value.x}px`,
  top: `${contextMenu.value.y}px`
}))

function openContextMenu(event: MouseEvent, tabId: string) {
  const menuWidth = 150
  const menuHeight = 152
  contextMenu.value.visible = true
  contextMenu.value.tabId = tabId
  contextMenu.value.x = Math.max(8, Math.min(event.clientX, window.innerWidth - menuWidth - 8))
  contextMenu.value.y = Math.max(8, Math.min(event.clientY, window.innerHeight - menuHeight - 8))
}

function closeContextMenu() {
  contextMenu.value.visible = false
  contextMenu.value.tabId = ''
}

function runMenuAction(action: ContextAction) {
  const tabId = contextMenu.value.tabId
  if (!tabId) {
    return
  }

  if (action === 'close') emit('close', tabId)
  if (action === 'closeOthers') emit('closeOthers', tabId)
  if (action === 'closeRight') emit('closeRight', tabId)
  if (action === 'duplicate') emit('duplicate', tabId)

  closeContextMenu()
}

function updateNewButtonWidth() {
  const source = inlineNewButtonRef.value || fixedNewButtonRef.value
  if (!source) {
    return
  }
  measuredNewButtonWidth.value = Math.max(source.offsetWidth, 28)
}

function updateOverflowState() {
  if (!tabsRootRef.value || !tabsTrackRef.value) {
    return
  }

  updateNewButtonWidth()

  const rootWidth = tabsRootRef.value.clientWidth
  const tabsWidth = tabsTrackRef.value.scrollWidth
  const spacing = 8
  isOverflowing.value = tabsWidth + measuredNewButtonWidth.value + spacing > rootWidth
  updateScrollState()
}

function updateScrollState() {
  if (!tabsListRef.value || !isOverflowing.value) {
    canScrollLeft.value = false
    canScrollRight.value = false
    return
  }

  const maxScrollLeft = tabsListRef.value.scrollWidth - tabsListRef.value.clientWidth
  canScrollLeft.value = tabsListRef.value.scrollLeft > 2
  canScrollRight.value = tabsListRef.value.scrollLeft < maxScrollLeft - 2
}

function scrollTabsToEnd(behavior: ScrollBehavior = 'smooth') {
  if (!tabsListRef.value) {
    return
  }
  tabsListRef.value.scrollTo({
    left: tabsListRef.value.scrollWidth,
    behavior
  })
  updateScrollState()
}

function scrollTabsBy(direction: -1 | 1) {
  if (!tabsListRef.value) {
    return
  }
  tabsListRef.value.scrollBy({
    left: direction * 220,
    behavior: 'smooth'
  })
}

function onTabsWheel(event: WheelEvent) {
  if (!tabsListRef.value || !isOverflowing.value) {
    return
  }
  tabsListRef.value.scrollLeft += event.deltaY + event.deltaX
  updateScrollState()
}

function openRenameDialog(tabId: string, title: string) {
  restoreDialogState()
  renameTabId.value = tabId
  renameValue.value = title
  showRenameDialog.value = true
  nextTick(() => {
    renameInputRef.value?.focusAndSelect()
  })
}

function closeRenameDialog() {
  persistDialogState()
  showRenameDialog.value = false
  renameTabId.value = ''
  renameValue.value = ''
}

function confirmRename() {
  const value = renameValue.value.trim()
  if (!value || !renameTabId.value) {
    return
  }
  emit('rename', renameTabId.value, value)
  closeRenameDialog()
}

const renameDialogStyle = computed(() => ({
  left: `${dialogLeft.value}px`,
  top: `${dialogTop.value}px`,
  width: `${dialogWidth.value}px`
}))

function getCenteredDialogPosition(width: number) {
  const safeWidth = Math.min(Math.max(width, DIALOG_MIN_WIDTH), DIALOG_MAX_WIDTH)
  return {
    width: safeWidth,
    left: Math.max(16, Math.round((window.innerWidth - safeWidth) / 2)),
    top: Math.max(16, Math.round((window.innerHeight - DIALOG_HEIGHT) / 2))
  }
}

function keepDialogInViewport() {
  const maxLeft = Math.max(16, window.innerWidth - dialogWidth.value - 16)
  const maxTop = Math.max(16, window.innerHeight - DIALOG_HEIGHT - 16)
  dialogLeft.value = Math.min(Math.max(16, dialogLeft.value), maxLeft)
  dialogTop.value = Math.min(Math.max(16, dialogTop.value), maxTop)
}

function restoreDialogState() {
  try {
    const raw = localStorage.getItem(DIALOG_STATE_KEY)
    if (!raw) {
      const centered = getCenteredDialogPosition(dialogWidth.value)
      dialogWidth.value = centered.width
      dialogLeft.value = centered.left
      dialogTop.value = centered.top
      return
    }

    const parsed = JSON.parse(raw) as { width?: number; left?: number; top?: number }
    const centered = getCenteredDialogPosition(parsed.width ?? dialogWidth.value)
    dialogWidth.value = centered.width
    dialogLeft.value = typeof parsed.left === 'number' ? parsed.left : centered.left
    dialogTop.value = typeof parsed.top === 'number' ? parsed.top : centered.top
    keepDialogInViewport()
  } catch {
    const centered = getCenteredDialogPosition(dialogWidth.value)
    dialogWidth.value = centered.width
    dialogLeft.value = centered.left
    dialogTop.value = centered.top
  }
}

function persistDialogState() {
  const payload = {
    width: dialogWidth.value,
    left: dialogLeft.value,
    top: dialogTop.value
  }
  localStorage.setItem(DIALOG_STATE_KEY, JSON.stringify(payload))
}

function startDragDialog(event: MouseEvent) {
  if (event.button !== 0) {
    return
  }
  isDragging.value = true
  dragOffsetX.value = event.clientX - dialogLeft.value
  dragOffsetY.value = event.clientY - dialogTop.value
}

function startResizeDialog(event: MouseEvent) {
  if (event.button !== 0) {
    return
  }
  isResizing.value = true
  resizeStartX.value = event.clientX
  resizeStartWidth.value = dialogWidth.value
}

function onMouseMove(event: MouseEvent) {
  if (isDragging.value) {
    dialogLeft.value = event.clientX - dragOffsetX.value
    dialogTop.value = event.clientY - dragOffsetY.value
    keepDialogInViewport()
  }

  if (isResizing.value) {
    const nextWidth = resizeStartWidth.value + (event.clientX - resizeStartX.value)
    dialogWidth.value = Math.min(Math.max(nextWidth, DIALOG_MIN_WIDTH), DIALOG_MAX_WIDTH)
    keepDialogInViewport()
  }
}

function stopInteraction() {
  if (!isDragging.value && !isResizing.value) {
    return
  }
  isDragging.value = false
  isResizing.value = false
  persistDialogState()
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && contextMenu.value.visible) {
    closeContextMenu()
    return
  }

  if (event.key === 'Escape' && showRenameDialog.value) {
    closeRenameDialog()
  }
}

watch(showRenameDialog, (visible) => {
  if (visible) {
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', stopInteraction)
    window.addEventListener('keydown', onKeydown)
    return
  }

  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', stopInteraction)
  window.removeEventListener('keydown', onKeydown)
})

watch(
  () => props.tabs,
  () => {
    nextTick(() => {
      updateOverflowState()
      if (props.tabs.length > previousTabsCount.value) {
        scrollTabsToEnd('smooth')
      }
      previousTabsCount.value = props.tabs.length
    })
  },
  { deep: true }
)

watch(isOverflowing, () => {
  nextTick(() => {
    updateOverflowState()
  })
})

onMounted(() => {
  updateOverflowState()
  if (!tabsRootRef.value || !tabsTrackRef.value) {
    return
  }

  resizeObserver = new ResizeObserver(() => {
    updateOverflowState()
  })
  resizeObserver.observe(tabsRootRef.value)
  resizeObserver.observe(tabsTrackRef.value)
  window.addEventListener('resize', updateOverflowState)
})

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', stopInteraction)
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('resize', updateOverflowState)
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
})
</script>

<style scoped>
.request-tabs {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: 6px var(--space-md);
  border-bottom: 1px solid var(--border-color);
  background: var(--panel-bg);
}

.request-tabs__list {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
  min-width: 0;
  overflow-x: auto;
  padding-bottom: 2px;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.request-tabs__track {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.request-tabs__list::-webkit-scrollbar {
  display: none;
}

.request-tabs__item {
  border: 1px solid var(--border-color);
  background: var(--bg-surface);
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  height: 30px;
  min-width: 160px;
  max-width: 280px;
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  padding: 0 var(--space-sm);
  cursor: pointer;
  transition: all var(--transition-base);
  flex-shrink: 0;
}

.request-tabs__item:hover {
  color: var(--text-primary);
  background: var(--bg-elevated);
}

.request-tabs__item--active {
  color: var(--text-primary);
  border-color: var(--accent-primary);
  box-shadow: inset 0 0 0 1px var(--accent-primary);
}

.request-tabs__method {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.4px;
  padding: 1px 4px;
  border-radius: var(--radius-xs);
  border: 1px solid transparent;
}

.request-tabs__method.get { background: var(--success-glow); color: var(--success-color); border-color: rgba(0, 255, 136, 0.2); }
.request-tabs__method.post { background: var(--info-glow); color: var(--accent-primary); border-color: rgba(0, 229, 255, 0.2); }
.request-tabs__method.put { background: var(--warning-glow); color: var(--warning-color); border-color: rgba(255, 184, 0, 0.2); }
.request-tabs__method.delete { background: var(--error-glow); color: var(--error-color); border-color: rgba(255, 68, 102, 0.2); }
.request-tabs__method.patch { background: rgba(139, 92, 246, 0.15); color: #a78bfa; border-color: rgba(139, 92, 246, 0.2); }
.request-tabs__method.head { background: rgba(45, 212, 191, 0.15); color: #2dd4bf; border-color: rgba(45, 212, 191, 0.2); }
.request-tabs__method.options { background: var(--info-glow); color: var(--info-color); border-color: rgba(0, 229, 255, 0.2); }

.request-tabs__title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
}

.request-tabs__close {
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.request-tabs__new {
  flex-shrink: 0;
  border: 1px dashed var(--border-color);
}

.request-tabs__new-wrap,
.request-tabs__new-fixed {
  display: inline-flex;
  flex-shrink: 0;
}

.request-tabs__nav {
  flex-shrink: 0;
}

.request-tabs__item:hover .request-tabs__close,
.request-tabs__item--active .request-tabs__close {
  opacity: 1;
}

.request-tabs__rename-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-sm);
}

.request-tabs__context-overlay {
  position: fixed;
  inset: 0;
  z-index: 9250;
}

.request-tabs__context-menu {
  position: fixed;
  width: 150px;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-lg);
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.request-tabs__context-item {
  width: 100%;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  text-align: left;
  font-size: 12px;
  padding: 7px 8px;
  border-radius: var(--radius-xs);
  cursor: pointer;
}

.request-tabs__context-item:hover {
  background: var(--bg-elevated);
  color: var(--text-primary);
}

.request-tabs__context-divider {
  height: 1px;
  background: var(--border-color);
  margin: 2px 0;
}

.request-tabs__rename-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(3px);
  z-index: 9200;
}

.request-tabs__rename-dialog {
  position: fixed;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg), 0 0 30px rgba(0, 229, 255, 0.06);
  overflow: hidden;
}

.request-tabs__rename-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-elevated);
  cursor: move;
  user-select: none;
}

.request-tabs__rename-title {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}

.request-tabs__rename-body {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.request-tabs__resize-handle {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 14px;
  height: 14px;
  border: none;
  background: transparent;
  cursor: nwse-resize;
}

.request-tabs__resize-handle::before {
  content: '';
  position: absolute;
  right: 3px;
  bottom: 3px;
  width: 7px;
  height: 7px;
  border-right: 1.5px solid var(--text-muted);
  border-bottom: 1.5px solid var(--text-muted);
}
</style>
