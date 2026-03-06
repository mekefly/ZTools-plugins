<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { TextDiffStrategy } from '@/core/diff/text/myers'
import { DiffChunk } from '@/core/diff/types'
import { useI18n } from 'vue-i18n'
import Select from '@/components/ui/Select.vue'
import { formatCode, detectLanguage } from '@/utils/formatter'
import { useSettingsStore } from '@/store/settings'
import { storeToRefs } from 'pinia'

const { t } = useI18n()
const settingsStore = useSettingsStore()
const { autoFormat } = storeToRefs(settingsStore)

const sourceText = ref('')
const targetText = ref('')
const selectedLang = ref('auto')

const langOptions = computed(() => [
    { label: t('autoDetect'), value: 'auto' },
    { label: 'JSON', value: 'json' },
    { label: 'YAML', value: 'yaml' },
    { label: 'HTML', value: 'html' },
    { label: 'CSS', value: 'css' },
    { label: 'JavaScript', value: 'javascript' },
    { label: 'TypeScript', value: 'typescript' },
    { label: 'Python', value: 'python' },
    { label: 'C', value: 'c' },
    { label: 'C++', value: 'cpp' },
    { label: 'Java', value: 'java' },
    { label: 'Rust', value: 'rust' },
    { label: 'Go', value: 'go' },
    { label: 'SQL', value: 'sql' },
    { label: 'Markdown', value: 'markdown' },
    { label: 'Shell', value: 'shell' },
])

const sourceLang = computed(() => {
    if (selectedLang.value !== 'auto') return selectedLang.value
    return detectLanguage(sourceText.value)
})

const targetLang = computed(() => {
    if (selectedLang.value !== 'auto') return selectedLang.value
    return detectLanguage(targetText.value)
})

const getLangLabel = (langValue: string) => {
    const opt = langOptions.value.find(o => o.value === langValue.toLowerCase())
    return opt ? opt.label : (langValue.toUpperCase() || 'Text')
}

const sourceLangLabel = computed(() => getLangLabel(sourceLang.value))
const targetLangLabel = computed(() => getLangLabel(targetLang.value))

const diffStrategy = new TextDiffStrategy()
const diffChunks = ref<DiffChunk[]>([])

watch([sourceText, targetText], ([orig, mod]) => {
    const result = diffStrategy.compute(orig, mod)
    diffChunks.value = result.chunks
}, { immediate: true })

// Compute line arrays mapped strictly to text inputs splitting by \n
const sourceLineArr = computed(() => sourceText.value === '' ? [] : sourceText.value.split('\n'))
const targetLineArr = computed(() => targetText.value === '' ? [] : targetText.value.split('\n'))

// Left lines highlight state
const leftLinesState = computed(() => {
    const states: string[] = []
    for (const chunk of diffChunks.value) {
        if (chunk.type === 'equal') states.push('equal')
        else if (chunk.type === 'delete') states.push('delete')
    }
    return states
})

// Right lines highlight state
const rightLinesState = computed(() => {
    const states: string[] = []
    for (const chunk of diffChunks.value) {
        if (chunk.type === 'equal') states.push('equal')
        else if (chunk.type === 'insert') states.push('insert')
    }
    return states
})

const addedCount = computed(() => diffChunks.value.filter(c => c.type === 'insert').length)
const removedCount = computed(() => diffChunks.value.filter(c => c.type === 'delete').length)

// Sync scrolling
const leftBack = ref<HTMLElement | null>(null)
const rightBack = ref<HTMLElement | null>(null)

const onLeftScroll = (e: Event) => {
    if (!leftBack.value) return
    const target = e.target as HTMLTextAreaElement
    leftBack.value.scrollTop = target.scrollTop
    leftBack.value.scrollLeft = target.scrollLeft
}

const onRightScroll = (e: Event) => {
    if (!rightBack.value) return
    const target = e.target as HTMLTextAreaElement
    rightBack.value.scrollTop = target.scrollTop
    rightBack.value.scrollLeft = target.scrollLeft
}

// Debounce timers
let sourceTimer: any = null
let targetTimer: any = null

const performAutoFormat = (side: 'source' | 'target') => {
    if (!autoFormat.value) return

    if (side === 'source') {
        const formatted = formatCode(sourceText.value, selectedLang.value)
        if (formatted !== sourceText.value) sourceText.value = formatted
    } else {
        const formatted = formatCode(targetText.value, selectedLang.value)
        if (formatted !== targetText.value) targetText.value = formatted
    }
}

// Watchers for debounced auto-format
watch(sourceText, () => {
    clearTimeout(sourceTimer)
    if (!autoFormat.value) return
    sourceTimer = setTimeout(() => performAutoFormat('source'), 1000)
})

watch(targetText, () => {
    clearTimeout(targetTimer)
    if (!autoFormat.value) return
    targetTimer = setTimeout(() => performAutoFormat('target'), 1000)
})

const handlePaste = (side: 'source' | 'target') => {
    if (!autoFormat.value) return
    // Immediate format on paste
    setTimeout(() => performAutoFormat(side), 10)
}

</script>

<template>
    <div class="flex flex-col h-full gap-4">
        <!-- Toolbar -->
        <div
            class="flex justify-between items-center px-4 py-2 bg-[var(--color-background)] shadow-sm rounded-lg border border-[var(--color-border)]">
            <div class="flex gap-6 items-center">
                <div class="flex items-center gap-2">
                    <span class="text-sm font-medium text-[var(--color-secondary)]">{{ t('language') }}</span>
                    <Select v-model="selectedLang" :options="langOptions" />
                </div>

            </div>
            <div class="flex gap-3 text-sm font-mono font-bold">
                <span class="text-[var(--color-insert-text)]">+{{ addedCount }}</span>
                <span class="text-[var(--color-delete-text)]">-{{ removedCount }}</span>
            </div>
        </div>

        <!-- WYSIWYG Diff Editors -->
        <div class="grid grid-cols-2 gap-4 flex-1 min-h-[400px]">

            <!-- Source Panel -->
            <div
                class="flex flex-col h-full rounded-lg border border-[var(--color-border)] overflow-hidden shadow-sm focus-within:ring-2 ring-[var(--color-cta)] transition-all bg-[var(--color-background)]">
                <div
                    class="bg-[var(--color-background)] px-3 py-2 text-xs font-mono font-bold uppercase tracking-widest border-b border-[var(--color-border)] text-[var(--color-secondary)] flex justify-between items-center h-10">
                    <div class="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
                            class="opacity-70">
                            <polyline points="16 18 22 12 16 6" />
                            <polyline points="8 6 2 12 8 18" />
                        </svg>
                        <span>{{ t('source') }}</span>
                    </div>
                    <div
                        class="px-2 py-0.5 rounded-md bg-[var(--color-surface)] border border-[var(--color-border)] text-[10px] text-[var(--color-cta)] font-bold shadow-sm flex items-center gap-1.5 transition-all hover:border-[var(--color-cta)]">
                        <span class="w-1 h-1 rounded-full bg-[var(--color-cta)] animate-pulse"></span>
                        {{ sourceLangLabel }}
                    </div>
                </div>
                <div class="relative flex-1 overflow-hidden group w-full h-full flex mt-0">
                    <!-- Diff Highlights Backdrop -->
                    <div ref="leftBack" class="absolute inset-0 overflow-hidden pointer-events-none z-0">
                        <div class="p-4 pb-16 font-mono text-sm leading-6 whitespace-pre inline-block min-w-full">
                            <div v-for="(line, i) in sourceLineArr" :key="'l-' + i"
                                :class="[leftLinesState[i] === 'delete' ? 'bg-[var(--color-delete-bg)] text-[var(--color-delete-text)]' : '', 'w-full']"
                                style="min-height: 1.5rem;">
                                <span class="text-transparent selection:bg-transparent">{{ line === '' ? ' ' : line
                                }}</span>
                            </div>
                            <div v-if="sourceLineArr.length === 0" style="min-height: 1.5rem;"></div>
                        </div>
                    </div>
                    <!-- Editable Textarea -->
                    <textarea v-model="sourceText" @scroll="onLeftScroll" @paste="handlePaste('source')"
                        class="relative block w-full h-full bg-transparent text-[var(--color-text)] caret-[var(--color-text)] p-4 pb-16 font-mono text-sm leading-6 resize-none outline-none z-10 whitespace-pre"
                        wrap="off" spellcheck="false" :placeholder="t('pasteSource')">
          </textarea>
                </div>
            </div>

            <!-- Target Panel -->
            <div
                class="flex flex-col h-full rounded-lg border border-[var(--color-border)] overflow-hidden shadow-sm focus-within:ring-2 ring-[var(--color-cta)] transition-all bg-[var(--color-background)]">
                <div
                    class="bg-[var(--color-background)] px-3 py-2 text-xs font-mono font-bold uppercase tracking-widest border-b border-[var(--color-border)] text-[var(--color-secondary)] flex justify-between items-center h-10">
                    <div class="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
                            class="opacity-70">
                            <polyline points="16 18 22 12 16 6" />
                            <polyline points="8 6 2 12 8 18" />
                        </svg>
                        <span>{{ t('target') }}</span>
                    </div>
                    <div
                        class="px-2 py-0.5 rounded-md bg-[var(--color-surface)] border border-[var(--color-border)] text-[10px] text-[var(--color-cta)] font-bold shadow-sm flex items-center gap-1.5 transition-all hover:border-[var(--color-cta)]">
                        <span class="w-1 h-1 rounded-full bg-[var(--color-cta)] animate-pulse"></span>
                        {{ targetLangLabel }}
                    </div>
                </div>
                <div class="relative flex-1 overflow-hidden group w-full h-full flex mt-0">
                    <!-- Diff Highlights Backdrop -->
                    <div ref="rightBack" class="absolute inset-0 overflow-hidden pointer-events-none z-0">
                        <div class="p-4 pb-16 font-mono text-sm leading-6 whitespace-pre inline-block min-w-full">
                            <div v-for="(line, i) in targetLineArr" :key="'r-' + i"
                                :class="[rightLinesState[i] === 'insert' ? 'bg-[var(--color-insert-bg)] text-[var(--color-insert-text)]' : '', 'w-full']"
                                style="min-height: 1.5rem;">
                                <span class="text-transparent selection:bg-transparent">{{ line === '' ? ' ' : line
                                }}</span>
                            </div>
                            <div v-if="targetLineArr.length === 0" style="min-height: 1.5rem;"></div>
                        </div>
                    </div>
                    <!-- Editable Textarea -->
                    <textarea v-model="targetText" @scroll="onRightScroll" @paste="handlePaste('target')"
                        class="relative block w-full h-full bg-transparent text-[var(--color-text)] caret-[var(--color-text)] p-4 pb-16 font-mono text-sm leading-6 resize-none outline-none z-10 whitespace-pre"
                        wrap="off" spellcheck="false" :placeholder="t('pasteTarget')">
          </textarea>
                </div>
            </div>

        </div>
    </div>
</template>

<style scoped lang="scss">
/* Ensure the textarea doesn't hide the background highlights underneath */
textarea {
    color: inherit;
    /* will use var(--color-text) */
    background: transparent;

    /* Scroller styling for textarea without transparent track */
    &::-webkit-scrollbar {
        width: 10px;
        height: 10px;
    }

    &::-webkit-scrollbar-track {
        background: rgba(128, 128, 128, 0.1);
        border-radius: 4px;
    }

    &::-webkit-scrollbar-thumb {
        background-color: var(--color-border);
        border-radius: 4px;
        border: 2px solid transparent;
        background-clip: content-box;
    }

    &:focus::-webkit-scrollbar-thumb {
        background-color: var(--color-cta);
    }
}
</style>
