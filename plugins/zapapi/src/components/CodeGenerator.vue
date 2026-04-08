<template>
  <div class="code-generator">
    <UiTabs v-model="activeLang" :tabs="languages">
      <template #default>
        <div class="code-output">
          <pre>{{ generatedCode }}</pre>
        </div>
        <div class="code-actions">
          <UiButton variant="primary" size="sm" @click="copyCode">
            <svg v-if="!copied" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
            </svg>
            <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            {{ copied ? t('code.copied') : t('code.copy') }}
          </UiButton>
        </div>
      </template>
    </UiTabs>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { generateCode, type CodeLanguage } from '../utils/codeGenerator'
import type { RequestState } from '../store/request'
import { useEnvironmentStore } from '../store/environments'
import { resolveVariables } from '../utils/variableResolver'
import UiTabs from './ui/UiTabs.vue'
import UiButton from './ui/UiButton.vue'

const { t } = useI18n()

const envStore = useEnvironmentStore()

const props = defineProps<{
  request: RequestState
}>()

const activeLang = ref<CodeLanguage>('curl')
const copied = ref(false)

const languages = computed(() => [
  { key: 'curl' as CodeLanguage, label: t('code.curl') },
  { key: 'javascript' as CodeLanguage, label: t('code.javascript') },
  { key: 'python' as CodeLanguage, label: t('code.python') }
])

const generatedCode = computed(() => {
  const snapshot = JSON.parse(JSON.stringify(props.request)) as RequestState
  const variables = envStore.getVariables()
  snapshot.url = resolveVariables(snapshot.url, variables)
  snapshot.params = snapshot.params.map((p) => ({
    ...p,
    key: resolveVariables(p.key, variables),
    value: resolveVariables(p.value, variables)
  }))
  snapshot.headers = snapshot.headers.map((h) => ({
    ...h,
    key: resolveVariables(h.key, variables),
    value: resolveVariables(h.value, variables)
  }))
  if (snapshot.body.raw) {
    snapshot.body.raw = resolveVariables(snapshot.body.raw, variables)
  }
  snapshot.body.formData = snapshot.body.formData.map((f) => ({
    ...f,
    key: resolveVariables(f.key, variables),
    value: resolveVariables(f.value, variables)
  }))
  if (snapshot.auth.token) snapshot.auth.token = resolveVariables(snapshot.auth.token, variables)
  if (snapshot.auth.username) snapshot.auth.username = resolveVariables(snapshot.auth.username, variables)
  if (snapshot.auth.password) snapshot.auth.password = resolveVariables(snapshot.auth.password, variables)
  if (snapshot.auth.apiKey) snapshot.auth.apiKey = resolveVariables(snapshot.auth.apiKey, variables)
  if (snapshot.auth.apiKeyHeader) snapshot.auth.apiKeyHeader = resolveVariables(snapshot.auth.apiKeyHeader, variables)
  return generateCode(snapshot, activeLang.value)
})

async function copyCode() {
  try {
    await navigator.clipboard.writeText(generatedCode.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = generatedCode.value
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  }
}
</script>

<style scoped>
.code-generator {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.code-output {
  flex: 1;
  overflow: auto;
  padding: var(--space-sm) 0;
}

.code-output pre {
  margin: 0;
  padding: var(--space-md);
  background: var(--code-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-family: 'JetBrains Mono', 'SF Mono', monospace;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
  color: var(--text-primary);
}

.code-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: var(--space-sm);
}
</style>
