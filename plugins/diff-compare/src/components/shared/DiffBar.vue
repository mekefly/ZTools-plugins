<script setup lang="ts">
import { ref } from 'vue'
import ZTooltip from '@/components/ui/base/ZTooltip.vue'

const scrollContainerRef = ref<HTMLElement | null>(null)
defineExpose({ scrollContainer: scrollContainerRef })

export interface DiffBarItem {
    type: 'equal' | 'delete' | 'insert' | 'modified' | 'added' | 'removed'
    sourceText?: string
    targetText?: string
}

defineProps<{
    title: string
    items: DiffBarItem[]
    activeIndex?: number
}>()

defineEmits<{
    scroll: [e: Event]
    itemClick: [index: number]
}>()
</script>

<template>
    <div
        class="diff-bar w-16 flex-shrink-0 bg-[var(--color-surface)] border-x border-[var(--color-border)] overflow-hidden flex flex-col no-scrollbar shadow-[0_0_15px_-3px_rgba(0,0,0,0.05)] z-10">
        <div
            class="diff-bar-header h-8 border-b border-[var(--color-border)] flex items-center justify-center bg-[var(--color-background)] flex-shrink-0 text-[10px] font-bold text-[var(--color-secondary)] uppercase tracking-tighter sticky top-0 z-40 shadow-sm">
            {{ title }}
        </div>
        <div ref="scrollContainerRef" class="overflow-auto scrollbar-hide flex-1 py-1 overflow-y-auto min-h-0"
            @scroll="$emit('scroll', $event)">
            <div :id="'diff-bar-item-' + idx" v-for="(item, idx) in items" :key="'bar-' + idx"
                class="h-8 flex items-center justify-center relative">
                <ZTooltip v-if="item.type !== 'equal'" position="top">
                    <div :class="[
                        'diff-icon-wrapper relative z-10 cursor-pointer',
                        'diff-icon--' + item.type,
                        activeIndex === idx ? 'diff-icon--active' : ''
                    ]" @click="$emit('itemClick', idx)">
                        <svg v-if="item.type === 'modified'" xmlns="http://www.w3.org/2000/svg" width="14" height="14"
                            viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                            stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                        </svg>
                        <svg v-else-if="item.type === 'insert' || item.type === 'added'"
                            xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        <svg v-else-if="item.type === 'delete' || item.type === 'removed'"
                            xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                    </div>
                    <template #content>
                        <div class="p-1 px-2 text-xs max-w-[200px]">
                            <div class="truncate" :title="item.sourceText || item.targetText">
                                {{ item.sourceText || item.targetText }}
                            </div>
                        </div>
                    </template>
                </ZTooltip>
                <div v-else class="w-1 h-1 rounded-full bg-[var(--color-border)] opacity-40"></div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.diff-icon-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 8px;
    transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.diff-icon--modified {
    color: #eab308;
    background-color: rgba(234, 179, 8, 0.1);
}

.diff-icon--insert,
.diff-icon--added {
    color: #10b981;
    background-color: rgba(16, 185, 129, 0.1);
}

.diff-icon--delete,
.diff-icon--removed {
    color: #ef4444;
    background-color: rgba(239, 68, 68, 0.1);
}

.diff-icon--active {
    transform: scale(1.15);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.diff-icon--active.diff-icon--modified {
    background-color: #eab308;
    color: white !important;
}

.diff-icon--active.diff-icon--insert,
.diff-icon--active.diff-icon--added {
    background-color: #10b981;
    color: white !important;
}

.diff-icon--active.diff-icon--delete,
.diff-icon--active.diff-icon--removed {
    background-color: #ef4444;
    color: white !important;
}

.dark .diff-icon--active.diff-icon--modified,
.dark .diff-icon--active.diff-icon--insert,
.dark .diff-icon--active.diff-icon--added,
.dark .diff-icon--active.diff-icon--delete,
.dark .diff-icon--active.diff-icon--removed {
    color: #111 !important;
}

.diff-icon-wrapper:hover:not(.diff-icon--active) {
    transform: scale(1.1);
    filter: brightness(1.2);
}

.no-scrollbar::-webkit-scrollbar {
    display: none;
}
</style>
