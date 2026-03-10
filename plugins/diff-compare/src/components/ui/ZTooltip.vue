<script setup lang="ts">
import { ref, onUnmounted } from 'vue'

const props = defineProps<{
    content?: string
    position?: 'top' | 'bottom' | 'left' | 'right'
}>()

const show = ref(false)
const tooltipRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLElement | null>(null)
const pos = ref({ top: 0, left: 0 })

const updatePos = () => {
    if (!triggerRef.value || !tooltipRef.value) return

    const rect = triggerRef.value.getBoundingClientRect()
    const tipRect = tooltipRef.value.getBoundingClientRect()

    let top = 0
    let left = 0
    const gap = 8

    switch (props.position || 'top') {
        case 'top':
            top = rect.top - tipRect.height - gap
            left = rect.left + (rect.width - tipRect.width) / 2
            break
        case 'bottom':
            top = rect.bottom + gap
            left = rect.left + (rect.width - tipRect.width) / 2
            break
        case 'left':
            top = rect.top + (rect.height - tipRect.height) / 2
            left = rect.left - tipRect.width - gap
            break
        case 'right':
            top = rect.top + (rect.height - tipRect.height) / 2
            left = rect.right + gap
            break
    }

    pos.value = { top, left }
}

const onMouseEnter = () => {
    show.value = true
    // Wait for DOM
    setTimeout(updatePos, 0)
}

const onMouseLeave = () => {
    show.value = false
}

onUnmounted(() => {
    show.value = false
})
</script>

<template>
    <div class="tooltip-trigger" ref="triggerRef" @mouseenter="onMouseEnter" @mouseleave="onMouseLeave">
        <slot />

        <Teleport to="body">
            <Transition name="tooltip">
                <div v-if="show" class="tooltip-content" ref="tooltipRef"
                    :style="{ top: `${pos.top}px`, left: `${pos.left}px` }">
                    {{ content }}
                    <slot name="content" />
                </div>
            </Transition>
        </Teleport>
    </div>
</template>

<style scoped lang="scss">
.tooltip-trigger {
    display: inline-block;
}

.tooltip-content {
    position: fixed;
    z-index: 9999;
    padding: 6px 10px;
    border-radius: 6px;
    background: rgba(15, 23, 42, 0.9);
    backdrop-filter: blur(8px);
    color: #fff;
    font-size: 11px;
    font-weight: 500;
    line-height: 1.4;
    pointer-events: none;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -1px rgba(0, 0, 0, 0.1);
    white-space: nowrap;
    border: 1px solid rgba(255, 255, 255, 0.08);

    :global(.dark) & {
        background: rgba(24, 24, 27, 0.9);
        border: 1px solid rgba(255, 255, 255, 0.05);
    }
}

.tooltip-enter-active,
.tooltip-leave-active {
    transition: opacity 150ms ease, transform 150ms ease;
}

.tooltip-enter-from,
.tooltip-leave-to {
    opacity: 0;
    transform: scale(0.95);
}
</style>
