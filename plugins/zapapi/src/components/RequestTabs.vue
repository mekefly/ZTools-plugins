<style scoped>
.request-tabs {
  display: flex;
  align-items: center;
  height: 38px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-color);
  user-select: none;
  position: relative;
  overflow: hidden;
}

.request-tabs__list {
  display: flex;
  align-items: center;
  flex: 1;
  height: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
}

.request-tabs__list::-webkit-scrollbar {
  display: none;
}

.request-tabs__track {
  display: flex;
  height: 100%;
}

.request-tabs__item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  height: 100%;
  min-width: 120px;
  max-width: 240px;
  background: var(--bg-surface);
  border-right: 1px solid var(--border-color);
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background var(--transition-fast), color var(--transition-fast);
  border-bottom: 2px solid transparent;
}

.request-tabs__item:hover {
  background: var(--bg-elevated);
}

.request-tabs__item--active {
  background: var(--bg-surface);
  color: var(--text-primary);
  border-bottom: 2px solid var(--accent-primary);
}

.request-tabs__method {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  background: var(--bg-elevated);
  text-transform: uppercase;
}

/* Postman colors for methods */
.request-tabs__method.get { color: #0b975d; }
.request-tabs__method.post { color: #ffb400; }
.request-tabs__method.put { color: #0072c6; }
.request-tabs__method.delete { color: #d12915; }
.request-tabs__method.patch { color: #ba6bd1; }
.request-tabs__method.options { color: #8e44ad; }

.request-tabs__title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.request-tabs__close {
  opacity: 0;
  color: var(--text-muted);
}

.request-tabs__item:hover .request-tabs__close,
.request-tabs__item--active .request-tabs__close {
  opacity: 1;
}

.request-tabs__close:hover {
  color: var(--text-primary);
  background: var(--bg-overlay);
}

.request-tabs__nav {
  height: 100%;
  border-radius: 0;
  color: var(--text-muted);
  border-right: 1px solid var(--border-color);
  border-left: 1px solid var(--border-color);
}

.request-tabs__new-wrap,
.request-tabs__new-fixed {
  display: flex;
  align-items: center;
  height: 100%;
  padding: 0 4px;
}

.request-tabs__new {
  height: 24px;
  width: 24px;
  color: var(--text-muted);
}

.request-tabs__new:hover {
  color: var(--text-primary);
}

.request-tabs__context-overlay,
.request-tabs__rename-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
}

.request-tabs__rename-overlay {
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
}

.request-tabs__context-menu {
  position: absolute;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-md);
  padding: 4px 0;
  min-width: 160px;
}

.request-tabs__context-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 6px 12px;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 13px;
  cursor: pointer;
  transition: background var(--transition-fast);
}

.request-tabs__context-item:hover {
  background: var(--bg-elevated);
}

.request-tabs__context-divider {
  height: 1px;
  background: var(--border-color);
  margin: 4px 0;
}

.request-tabs__rename-dialog {
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  width: 400px;
  overflow: hidden;
}

.request-tabs__rename-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-elevated);
  cursor: move;
}

.request-tabs__rename-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.request-tabs__rename-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.request-tabs__rename-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>

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
  gap: 0;
  padding: 0;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-base);
  height: 36px;
}

.request-tabs__list {
  display: flex;
  align-items: flex-end;
  height: 100%;
  flex: 1;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.request-tabs__track {
  display: flex;
  align-items: flex-end;
  height: 100%;
  flex-shrink: 0;
}

.request-tabs__list::-webkit-scrollbar {
  display: none;
}

.request-tabs__item {
  border: 1px solid transparent;
  border-right: 1px solid var(--border-color);
  background: var(--bg-base);
  color: var(--text-secondary);
  height: 36px;
  min-width: 160px;
  max-width: 240px;
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  padding: 0 12px;
  cursor: pointer;
  flex-shrink: 0;
  border-top: 2px solid transparent;
  border-bottom: 1px solid var(--border-color);
}

.request-tabs__item:first-child {
  border-left: 1px solid var(--border-color);
}

.request-tabs__item:hover {
  background: var(--bg-surface);
}

.request-tabs__item--active {
  color: var(--text-primary);
  background: var(--bg-surface);
  border-top-color: var(--accent-primary);
  border-bottom-color: transparent;
}

.request-tabs__method {
  font-size: 10px;
  font-weight: 600;
  flex-shrink: 0;
  text-transform: uppercase;
}

.request-tabs__method.get { color: var(--success-color); }
.request-tabs__method.post { color: var(--warning-color); }
.request-tabs__method.put { color: var(--info-color); }
.request-tabs__method.delete { color: var(--error-color); }
.request-tabs__method.patch { color: #a78bfa; }
.request-tabs__method.head { color: #2dd4bf; }
.request-tabs__method.options { color: #a8a29e; }

.request-tabs__title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
}

.request-tabs__close {
  opacity: 0;
  border-radius: 4px;
}
.request-tabs__close:hover {
  background: var(--border-color);
}

.request-tabs__new {
  flex-shrink: 0;
  height: 36px;
  width: 36px;
  border: none;
  border-bottom: 1px solid var(--border-color);
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
}
.request-tabs__new:hover {
  background: var(--bg-surface);
}

.request-tabs__new-wrap,
.request-tabs__new-fixed {
  display: inline-flex;
  flex-shrink: 0;
}

.request-tabs__nav {
  flex-shrink: 0;
  height: 36px;
  border-bottom: 1px solid var(--border-color);
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
  width: 160px;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  z-index: 9251;
}

.request-tabs__context-item {
  width: 100%;
  border: none;
  background: transparent;
  color: var(--text-primary);
  text-align: left;
  font-size: 12px;
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.request-tabs__context-item:hover {
  background: var(--bg-elevated);
}

.request-tabs__context-divider {
  height: 1px;
  background: var(--border-color);
  margin: 2px 0;
}

.request-tabs__rename-overlay {
  position: fixed;
  inset: 0;
  background: var(--overlay-bg, rgba(0, 0, 0, 0.4));
  z-index: 9200;
}

.request-tabs__rename-dialog {
  position: fixed;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  overflow: hidden;
  z-index: 9201;
}

.request-tabs__rename-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-surface);
  cursor: move;
  user-select: none;
}

.request-tabs__rename-title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.request-tabs__rename-body {
  padding: 16px;
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
  right: 4px;
  bottom: 4px;
  width: 6px;
  height: 6px;
  border-right: 1.5px solid var(--text-muted);
  border-bottom: 1.5px solid var(--text-muted);
}
</style>
