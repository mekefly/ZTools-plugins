<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import SettingsPanel from '@/components/ui/SettingsPanel.vue'

defineProps({
    initialMode: {
        type: String,
        default: 'text'
    }
})

const { t } = useI18n()
const activeMode = ref('text')
const isDark = ref(true)
const showSettings = ref(false)

const toggleTheme = () => {
    isDark.value = !isDark.value
    document.documentElement.classList.toggle('dark', isDark.value)
}

onMounted(() => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        isDark.value = true
        document.documentElement.classList.add('dark')
    } else {
        isDark.value = false
        document.documentElement.classList.remove('dark')
    }
})
</script>

<template>
    <div
        class="workbench-container h-screen overflow-hidden bg-[var(--color-background)] text-[var(--color-text)] flex flex-col transition-colors duration-300">

        <!-- Top Navigation Bar -->
        <header class="relative flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">

            <!-- Left: empty balancer -->
            <div class="w-20"></div>

            <!-- Center: mode tabs -->
            <div class="flex gap-1">
                <button @click="activeMode = 'text'" :class="['mode-tab', activeMode === 'text' ? 'active' : '']">
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="16 18 22 12 16 6" />
                        <polyline points="8 6 2 12 8 18" />
                    </svg>
                    {{ t('textMode') }}
                </button>
                <button @click="activeMode = 'image'" :class="['mode-tab', activeMode === 'image' ? 'active' : '']">
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                        <circle cx="9" cy="9" r="2" />
                        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                    </svg>
                    {{ t('imageMode') }}
                </button>
            </div>

            <!-- Right: icon buttons -->
            <div class="flex items-center gap-1 w-20 justify-end">
                <!-- Theme toggle -->
                <button @click="toggleTheme" class="icon-btn" :title="t('toggleTheme')">
                    <svg v-if="!isDark" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                        fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                        stroke-linejoin="round">
                        <circle cx="12" cy="12" r="4" />
                        <path
                            d="M12 2v2M12 20v2m-7.07-14.07 1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2m-4.93-7.07-1.41 1.41M6.34 17.66l-1.41 1.41" />
                    </svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                        fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                        stroke-linejoin="round">
                        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                    </svg>
                </button>
                <!-- Settings -->
                <button @click="showSettings = true" class="icon-btn" :title="'Settings'">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path
                            d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                        <circle cx="12" cy="12" r="3" />
                    </svg>
                </button>
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

<style scoped lang="scss">
.mode-tab {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 14px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    color: var(--color-secondary);
    transition: all 180ms ease;
    background: transparent;
    border: 1px solid transparent;
    cursor: pointer;
    white-space: nowrap;

    &:hover {
        color: var(--color-text);
        background: var(--color-border);
    }

    &.active {
        background: var(--color-primary);
        color: var(--color-background);
        border-color: var(--color-primary);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
    }
}

.icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 6px;
    color: var(--color-secondary);
    background: transparent;
    border: none;
    cursor: pointer;
    transition: all 180ms ease;

    &:hover {
        color: var(--color-text);
        background: var(--color-border);
    }
}
</style>
