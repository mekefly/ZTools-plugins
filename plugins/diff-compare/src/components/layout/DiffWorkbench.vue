<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import SettingsPanel from '@/components/ui/SettingsPanel.vue'
import ZTooltip from '@/components/ui/base/ZTooltip.vue'
import ZButton from '@/components/ui/base/ZButton.vue'
import { useTheme } from '@/composables/useTheme'

const props = defineProps<{
    initialMode?: string
}>()

const { locale, t } = useI18n()
const activeMode = ref(props.initialMode || 'text')

watchEffect(() => {
    activeMode.value = props.initialMode || 'text'
})

const { isDark, toggleTheme } = useTheme()
const showSettings = ref(false)
</script>

<template>
    <div
        class="workbench-container h-screen overflow-hidden bg-[var(--color-background)] text-[var(--color-text)] flex flex-col transition-colors duration-300">

        <!-- Top Navigation Bar -->
        <header class="relative flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">

            <!-- Left: empty balancer -->
            <div class="w-20"></div>

            <!-- Center: mode tabs -->
            <div
                class="flex gap-1.5 p-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-sm">
                <ZButton variant="ghost" size="sm" :active="activeMode === 'text'" @click="activeMode = 'text'">
                    <template #icon-left>
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="16 18 22 12 16 6" />
                            <polyline points="8 6 2 12 8 18" />
                        </svg>
                    </template>
                    {{ t('textMode') }}
                </ZButton>
                <ZButton variant="ghost" size="sm" :active="activeMode === 'image'" @click="activeMode = 'image'">
                    <template #icon-left>
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                            <circle cx="9" cy="9" r="2" />
                            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                        </svg>
                    </template>
                    {{ t('imageMode') }}
                </ZButton>
                <ZButton variant="ghost" size="sm" :active="activeMode === 'excel'" @click="activeMode = 'excel'">
                    <template #icon-left>
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                            <polyline points="14 2 14 8 20 8" />
                            <path d="M8 13h2" />
                            <path d="M8 17h2" />
                            <path d="M14 13h2" />
                            <path d="M14 17h2" />
                        </svg>
                    </template>
                    {{ t('excelMode') }}
                </ZButton>
                <ZButton variant="ghost" size="sm" :active="activeMode === 'word'" @click="activeMode = 'word'">
                    <template #icon-left>
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4" />
                            <polyline points="14 2 14 8 20 8" />
                            <path d="M2 15h10" />
                            <path d="m9 18 3-3-3-3" />
                        </svg>
                    </template>
                    {{ t('wordMode') }}
                </ZButton>
                <ZButton variant="ghost" size="sm" :active="activeMode === 'pdf'" @click="activeMode = 'pdf'">
                    <template #icon-left>
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="16" x2="8" y1="13" y2="13" />
                            <line x1="16" x2="8" y1="17" y2="17" />
                            <polyline points="10 9 9 9 8 9" />
                        </svg>
                    </template>
                    {{ t('pdfMode') }}
                </ZButton>
            </div>

            <!-- Right: icon buttons -->
            <div class="flex items-center gap-1.5 w-24 justify-end">
                <!-- Theme toggle -->
                <ZTooltip position="bottom"
                    :content="isDark ? (locale === 'zh' ? '开启亮色' : 'Light Mode') : (locale === 'zh' ? '开启暗色' : 'Dark Mode')">
                    <ZButton variant="surface" size="md" @click="toggleTheme" class="!w-10 !h-10 !p-0">
                        <svg v-if="isDark" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                            fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                            stroke-linejoin="round">
                            <circle cx="12" cy="12" r="4" />
                            <path d="M12 2v2" />
                            <path d="M12 20v2" />
                            <path d="m4.93 4.93 1.41 1.41" />
                            <path d="m17.66 17.66 1.41 1.41" />
                            <path d="M2 12h2" />
                            <path d="M20 12h2" />
                            <path d="m6.34 17.66-1.41 1.41" />
                            <path d="m19.07 4.93-1.41 1.41" />
                        </svg>
                        <svg v-else xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                            fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                            stroke-linejoin="round">
                            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                        </svg>
                    </ZButton>
                </ZTooltip>
                <!-- Settings -->
                <ZTooltip position="bottom" :content="locale === 'zh' ? '设置' : 'Settings'">
                    <ZButton variant="surface" size="md" @click="showSettings = true" class="!w-10 !h-10 !p-0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path
                                d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                            <circle cx="12" cy="12" r="3" />
                        </svg>
                    </ZButton>
                </ZTooltip>
            </div>
        </header>

        <!-- Main Content Area -->
        <main class="flex-1 p-5 flex flex-col overflow-hidden min-h-0">
            <!-- flex-1 wrapper lets slot children (TextDiffView/ImageDiffView) fill full height -->
            <div class="flex-1 min-h-0 flex flex-col">
                <slot :name="activeMode"></slot>
            </div>
            <div v-if="!$slots[activeMode]"
                class="flex-1 flex items-center justify-center text-[var(--color-secondary)] opacity-60">
                <span class="font-mono text-sm">{{ t('wip') }}</span>
            </div>
        </main>

        <!-- Settings Panel (slide-in from right) -->
        <SettingsPanel v-if="showSettings" @close="showSettings = false" />
    </div>
</template>

<style scoped lang="scss"></style>