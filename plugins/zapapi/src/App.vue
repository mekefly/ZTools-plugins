<template>
  <div class="zapapi-app">
    <div class="zapapi-header">
      <div class="zapapi-logo">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
        </svg>
        <span>ZapApi</span>
      </div>
      <div class="zapapi-env-selector">
        <span class="zapapi-env-label">{{ t('app.env') }}</span>
        <UiSelect
          v-model="activeEnvId"
          :options="envOptions"
          :placeholder="t('app.noEnv')"
        />
        <UiTooltip :content="t('app.manageEnv')" placement="bottom">
          <UiButton variant="ghost" size="sm" icon-only @click="showEnvManager = true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/><line x1="2" y1="10" x2="22" y2="10"/>
            </svg>
          </UiButton>
        </UiTooltip>
      </div>
      <div class="zapapi-actions">
        <UiButton variant="secondary" size="sm" :disabled="!activeTab || !activeTab.request.url" @click="showCodeGenerator = true">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
          </svg>
          {{ t('app.code') }}
        </UiButton>
        <UiTooltip :content="t('common.settings')" placement="bottom">
          <UiButton variant="ghost" size="sm" icon-only @click="showSettings = true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </UiButton>
        </UiTooltip>
      </div>
    </div>
    <div class="zapapi-body">
      <Sidebar
        :active-collection="activeCollectionId"
        :active-request="activeRequestId"
        :collapsed="sidebarCollapsed"
        @select-request="onSelectRequest"
        @open-request-in-new-tab="onOpenRequestInNewTab"
        @new-request="onNewRequest"
        @new-collection="onNewCollection"
        @toggle="sidebarCollapsed = !sidebarCollapsed"
        @manage-collections="showCollectionManager = true"
        @load-history="onLoadHistory"
      />
      <div class="zapapi-main">
        <RequestTabs
          :tabs="tabItems"
          :active-tab-id="activeTabId"
          @select="switchTab"
          @close="closeTab"
          @close-others="closeOtherTabs"
          @close-right="closeRightTabs"
          @duplicate="duplicateTab"
          @new="newTab"
          @rename="renameTab"
        />
        <RequestBuilder
          :request="activeTab.request"
          :response="activeTab.response"
          :sending="activeTab.sending"
          :has-response="hasResponse"
          @send="onSend"
          @save="onSave"
          @cancel="onCancelSend"
        />
        <ResponseViewer
          v-if="hasResponse"
          :response="activeTab.response"
          :sending="activeTab.sending"
        />
      </div>
    </div>

    <UiModal v-if="showEnvManager" :title="t('app.envManagerTitle')" size="lg" @close="showEnvManager = false">
      <EnvironmentManager />
    </UiModal>
    <UiModal v-if="showCodeGenerator" :title="t('app.codeGeneratorTitle')" size="md" @close="showCodeGenerator = false">
      <CodeGenerator :request="activeTab.request" />
    </UiModal>
    <UiModal v-if="showCollectionManager" :title="t('app.collectionManagerTitle')" size="md" @close="showCollectionManager = false">
      <CollectionManager />
    </UiModal>
    <UiConfirm
      v-if="pendingTabClose"
      :title="t('tabs.unsavedTitle')"
      :message="pendingTabClose.message"
      :confirm-text="t('tabs.closeAnyway')"
      :cancel-text="t('common.cancel')"
      confirm-variant="danger"
      @confirm="confirmPendingTabClose"
      @cancel="pendingTabClose = null"
    />
    <SettingsModal v-if="showSettings" @close="showSettings = false" />
    <UiToast ref="toastRef" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Sidebar from './components/Sidebar.vue'
import RequestBuilder from './components/RequestBuilder.vue'
import ResponseViewer from './components/ResponseViewer.vue'
import RequestTabs from './components/RequestTabs.vue'
import EnvironmentManager from './components/EnvironmentManager.vue'
import CodeGenerator from './components/CodeGenerator.vue'
import CollectionManager from './components/CollectionManager.vue'
import SettingsModal from './components/SettingsModal.vue'
import UiSelect from './components/ui/UiSelect.vue'
import UiButton from './components/ui/UiButton.vue'
import UiModal from './components/ui/UiModal.vue'
import UiToast from './components/ui/UiToast.vue'
import UiTooltip from './components/ui/UiTooltip.vue'
import UiConfirm from './components/ui/UiConfirm.vue'
import type { RequestState, ResponseState } from './store/request'
import { useEnvironmentStore } from './store/environments'
import { useCollectionsStore } from './store/collections'
import { useHistoryStore, type HistoryItem } from './store/history'
import { createRequestController, type SendController } from './utils/requestExecutor'

const { t } = useI18n()

const envStore = useEnvironmentStore()
const collectionsStore = useCollectionsStore()
const historyStore = useHistoryStore()
const toastRef = ref<InstanceType<typeof UiToast> | null>(null)

const showEnvManager = ref(false)
const showCodeGenerator = ref(false)
const showCollectionManager = ref(false)
const showSettings = ref(false)
const sidebarCollapsed = ref(false)
const pendingTabClose = ref<PendingTabCloseState | null>(null)

interface RequestTabState {
  id: string
  request: RequestState
  savedSnapshot: RequestState
  response: ResponseState
  collectionId: string | null
  requestId: string | null
  customTitle: string | null
  sending: boolean
  controller: SendController | null
}

interface PendingTabCloseState {
  ids: string[]
  message: string
}

const DEFAULT_REQUEST: RequestState = {
  method: 'GET',
  url: '',
  params: [],
  headers: [],
  auth: {
    type: 'none',
    token: '',
    username: '',
    password: '',
    apiKey: '',
    apiKeyLocation: 'header',
    apiKeyHeader: 'X-API-Key'
  },
  body: {
    type: 'none',
    raw: '',
    formData: []
  }
}

const DEFAULT_RESPONSE: ResponseState = {
  status: null,
  statusText: '',
  time: null,
  size: null,
  headers: {},
  body: '',
  raw: '',
  error: null,
  contentType: '',
  isBinary: false,
  base64Body: null,
  fileName: null
}

function cloneData<T>(data: T): T {
  return JSON.parse(JSON.stringify(data)) as T
}

function createEmptyRequest(): RequestState {
  return cloneData(DEFAULT_REQUEST)
}

function createEmptyResponse(): ResponseState {
  return cloneData(DEFAULT_RESPONSE)
}

function createTabId(): string {
  return `tab_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function createEmptyTab(): RequestTabState {
  const request = createEmptyRequest()
  return {
    id: createTabId(),
    request,
    savedSnapshot: cloneData(request),
    response: createEmptyResponse(),
    collectionId: null,
    requestId: null,
    customTitle: null,
    sending: false,
    controller: null
  }
}

const tabs = ref<RequestTabState[]>([createEmptyTab()])
const activeTabId = ref(tabs.value[0].id)

const activeTab = computed(() => {
  const found = tabs.value.find((tab) => tab.id === activeTabId.value)
  return found || tabs.value[0]
})

const activeCollectionId = computed(() => activeTab.value?.collectionId || null)
const activeRequestId = computed(() => activeTab.value?.requestId || null)

const envOptions = computed(() => {
  return envStore.state.environments.map((e) => ({ label: e.name, value: e.id }))
})

const activeEnvId = computed({
  get: () => envStore.state.activeEnvId,
  set: (val: string | null) => envStore.setActiveEnv(val)
})

const hasResponse = computed(() => {
  return (
    activeTab.value.sending ||
    activeTab.value.response.status !== null ||
    Boolean(activeTab.value.response.error)
  )
})

function tabTitle(tab: RequestTabState): string {
  if (tab.customTitle?.trim()) {
    return tab.customTitle
  }

  if (tab.collectionId && tab.requestId) {
    const collection = collectionsStore.state.collections.find((item) => item.id === tab.collectionId)
    const req = collection?.requests.find((item) => item.id === tab.requestId)
    if (req?.name?.trim()) {
      return req.name
    }
  }

  if (tab.request.url.trim()) {
    return tab.request.url
  }

  return t('tabs.untitledRequest')
}

function isTabDirty(tab: RequestTabState): boolean {
  return JSON.stringify(tab.request) !== JSON.stringify(tab.savedSnapshot)
}

const tabItems = computed(() => {
  return tabs.value.map((tab) => ({
    id: tab.id,
    title: tabTitle(tab),
    method: tab.request.method || 'GET'
  }))
})

function toast(msg: string) {
  if (toastRef.value) {
    toastRef.value.success(msg)
  } else {
    window.ztools.showTip(msg)
  }
}

function loadIntoActiveTab(request: RequestState, collectionId: string | null, requestId: string | null) {
  if (activeTab.value.controller) {
    activeTab.value.controller.cancel()
  }
  activeTab.value.request = cloneData(request)
  activeTab.value.savedSnapshot = cloneData(request)
  activeTab.value.response = createEmptyResponse()
  activeTab.value.collectionId = collectionId
  activeTab.value.requestId = requestId
  activeTab.value.customTitle = null
  activeTab.value.sending = false
  activeTab.value.controller = null
}

function onSelectRequest(collectionId: string, requestId: string) {
  const collection = collectionsStore.state.collections.find((c) => c.id === collectionId)
  if (collection) {
    const request = collection.requests.find((r) => r.id === requestId)
    if (request) {
      loadIntoActiveTab(request as any, collectionId, requestId)
    }
  }
}

function onOpenRequestInNewTab(collectionId: string, requestId: string) {
  const collection = collectionsStore.state.collections.find((c) => c.id === collectionId)
  if (!collection) {
    return
  }

  const request = collection.requests.find((r) => r.id === requestId)
  if (!request) {
    return
  }

  const requestData = cloneData(request as any)
  const tab: RequestTabState = {
    id: createTabId(),
    request: requestData,
    savedSnapshot: cloneData(requestData),
    response: createEmptyResponse(),
    collectionId,
    requestId,
    customTitle: null,
    sending: false,
    controller: null
  }

  tabs.value.push(tab)
  activeTabId.value = tab.id
}

function onNewRequest(collectionId: string) {
  const newReq = collectionsStore.addRequest(collectionId, {
    name: t('app.newRequest'),
    method: 'GET',
    url: '',
    params: [],
    headers: [],
    auth: { type: 'none', token: '', username: '', password: '', apiKey: '', apiKeyLocation: 'header', apiKeyHeader: '' },
    body: { type: 'none', raw: '', formData: [] }
  })
  loadIntoActiveTab(newReq as any, collectionId, newReq.id)
}

function onNewCollection() {
  const name = `${t('collection.defaultName')} ${collectionsStore.state.collections.length + 1}`
  collectionsStore.createCollection(name)
}

function onLoadHistory(item: HistoryItem) {
  loadIntoActiveTab(
    {
      method: item.method,
      url: item.url,
      params: item.params,
      headers: item.headers,
      auth: item.auth,
      body: item.body
    } as any,
    null,
    null
  )
}

function newTab() {
  const tab = createEmptyTab()
  tabs.value.push(tab)
  activeTabId.value = tab.id
}

function switchTab(tabId: string) {
  const target = tabs.value.find((tab) => tab.id === tabId)
  if (target) {
    activeTabId.value = tabId
  }
}

function closeTab(tabId: string) {
  requestCloseTabs([tabId])
}

function renameTab(tabId: string, title: string) {
  const tab = tabs.value.find((item) => item.id === tabId)
  if (!tab) {
    return
  }
  tab.customTitle = title.trim()
}

function closeOtherTabs(tabId: string) {
  const ids = tabs.value.filter((tab) => tab.id !== tabId).map((tab) => tab.id)
  requestCloseTabs(ids)
}

function closeRightTabs(tabId: string) {
  const index = tabs.value.findIndex((tab) => tab.id === tabId)
  if (index === -1) {
    return
  }
  const ids = tabs.value.slice(index + 1).map((tab) => tab.id)
  requestCloseTabs(ids)
}

function duplicateTab(tabId: string) {
  const index = tabs.value.findIndex((tab) => tab.id === tabId)
  if (index === -1) {
    return
  }

  const source = tabs.value[index]
  const copiedRequest = cloneData(source.request)
  const copyTitle = source.customTitle?.trim() ? `${source.customTitle} (${t('tabs.copySuffix')})` : null
  const newTabState: RequestTabState = {
    id: createTabId(),
    request: copiedRequest,
    savedSnapshot: cloneData(copiedRequest),
    response: createEmptyResponse(),
    collectionId: null,
    requestId: null,
    customTitle: copyTitle,
    sending: false,
    controller: null
  }

  tabs.value.splice(index + 1, 0, newTabState)
  activeTabId.value = newTabState.id
}

function forceCloseTabs(ids: string[]) {
  if (ids.length === 0) {
    return
  }

  const idSet = new Set(ids)
  const currentTabs = tabs.value
  const currentActiveId = activeTabId.value
  const activeIndex = currentTabs.findIndex((tab) => tab.id === currentActiveId)

  for (const tab of currentTabs) {
    if (idSet.has(tab.id) && tab.controller) {
      tab.controller.cancel()
    }
  }

  const remaining = currentTabs.filter((tab) => !idSet.has(tab.id))

  if (remaining.length === 0) {
    const fallback = createEmptyTab()
    tabs.value = [fallback]
    activeTabId.value = fallback.id
    return
  }

  if (!idSet.has(currentActiveId)) {
    tabs.value = remaining
    return
  }

  let nextActiveId: string | null = null

  for (let i = activeIndex + 1; i < currentTabs.length; i += 1) {
    if (!idSet.has(currentTabs[i].id)) {
      nextActiveId = currentTabs[i].id
      break
    }
  }

  if (!nextActiveId) {
    for (let i = activeIndex - 1; i >= 0; i -= 1) {
      if (!idSet.has(currentTabs[i].id)) {
        nextActiveId = currentTabs[i].id
        break
      }
    }
  }

  tabs.value = remaining
  activeTabId.value = nextActiveId || remaining[0].id
}

function requestCloseTabs(ids: string[]) {
  const closeIds = Array.from(new Set(ids)).filter((id) => tabs.value.some((tab) => tab.id === id))
  if (closeIds.length === 0) {
    return
  }

  const dirtyCount = closeIds.filter((id) => {
    const tab = tabs.value.find((item) => item.id === id)
    return tab ? isTabDirty(tab) : false
  }).length

  if (dirtyCount > 0) {
    pendingTabClose.value = {
      ids: closeIds,
      message: dirtyCount === 1
        ? t('tabs.unsavedMsgSingle')
        : t('tabs.unsavedMsgBatch', { count: dirtyCount })
    }
    return
  }

  forceCloseTabs(closeIds)
}

function confirmPendingTabClose() {
  if (!pendingTabClose.value) {
    return
  }
  forceCloseTabs(pendingTabClose.value.ids)
  pendingTabClose.value = null
}

async function onSend() {
  if (!activeTab.value.request.url) {
    return
  }

  activeTab.value.sending = true
  activeTab.value.response = createEmptyResponse()

  const variables = envStore.getVariables()
  const snapshot = cloneData(activeTab.value.request)

  const historyItem = historyStore.addItem({
    method: snapshot.method,
    url: snapshot.url,
    params: snapshot.params,
    headers: snapshot.headers,
    auth: snapshot.auth,
    body: snapshot.body
  })

  try {
    const controller = createRequestController(snapshot, variables)
    activeTab.value.controller = controller
    const result = await controller.promise
    historyStore.updateResult(historyItem.id, result.status, result.time)

    activeTab.value.response = {
      status: result.status,
      statusText: result.statusText,
      time: result.time,
      size: result.size,
      headers: result.headers,
      body: result.body,
      raw: result.raw,
      error: result.error,
      contentType: result.contentType,
      isBinary: result.isBinary,
      base64Body: result.base64Body,
      fileName: result.fileName
    }
  } catch (error: unknown) {
    activeTab.value.response = {
      ...activeTab.value.response,
      error: error instanceof Error ? error.message : t('response.failed')
    }
  } finally {
    activeTab.value.controller = null
    activeTab.value.sending = false
  }
}

function onCancelSend() {
  if (activeTab.value.controller) {
    activeTab.value.controller.cancel()
  }
}

function onSave() {
  if (activeTab.value.collectionId && activeTab.value.requestId) {
    collectionsStore.updateRequest(activeTab.value.collectionId, activeTab.value.requestId, {
      ...cloneData(activeTab.value.request)
    })
    activeTab.value.savedSnapshot = cloneData(activeTab.value.request)
    toast(t('app.saved'))
    return
  }

  const targetCollectionId = activeCollectionId.value
  if (!targetCollectionId) {
    toast(t('tabs.saveNeedCollection'))
    return
  }

  const defaultName = activeTab.value.customTitle?.trim() || activeTab.value.request.url.trim() || t('tabs.untitledRequest')
  const newReq = collectionsStore.addRequest(targetCollectionId, {
    name: defaultName,
    method: activeTab.value.request.method,
    url: activeTab.value.request.url,
    params: cloneData(activeTab.value.request.params),
    headers: cloneData(activeTab.value.request.headers),
    auth: cloneData(activeTab.value.request.auth),
    body: cloneData(activeTab.value.request.body)
  })

  activeTab.value.collectionId = targetCollectionId
  activeTab.value.requestId = newReq.id
  activeTab.value.savedSnapshot = cloneData(activeTab.value.request)
  toast(t('tabs.savedAsNewRequest'))
}

</script>

<style scoped>
.zapapi-app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--bg-deep);
  color: var(--text-primary);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.zapapi-header {
  display: flex;
  align-items: center;
  gap: var(--space-lg);
  padding: var(--space-md) var(--space-lg);
  background: var(--header-bg);
  backdrop-filter: blur(var(--glass-blur));
  border-bottom: 1px solid var(--border-color);
}

.zapapi-logo {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-weight: 700;
  font-size: 15px;
  color: var(--accent-primary);
  letter-spacing: -0.02em;
  text-shadow: 0 0 20px var(--accent-glow);
}

.zapapi-env-selector {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-left: auto;
}

.zapapi-env-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
}

.zapapi-actions {
  display: flex;
  gap: var(--space-sm);
}

.zapapi-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.zapapi-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}
</style>
