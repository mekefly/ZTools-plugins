<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'ghost-cta' | 'surface'
    size?: 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm'
    active?: boolean
    disabled?: boolean
    block?: boolean
    class?: string
}>()

const emit = defineEmits(['click'])

const classes = computed(() => {
    return [
        'z-btn',
        `z-btn--${props.variant || 'secondary'}`,
        `z-btn--${props.size || 'md'}`,
        { 'z-btn--active': props.active },
        { 'z-btn--block': props.block },
        { 'z-btn--disabled': props.disabled },
        props.class
    ]
})

const handleClick = (e: MouseEvent) => {
    if (props.disabled) return
    emit('click', e)
}
</script>

<template>
    <button :class="classes" :disabled="disabled" @click="handleClick">
        <slot name="icon-left" />
        <slot />
        <slot name="icon-right" />
    </button>
</template>

<style scoped lang="scss">
.z-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 180ms cubic-bezier(0.4, 0, 0.2, 1);
    user-select: none;
    border: 1px solid transparent;
    white-space: nowrap;
    outline: none;

    &:active:not(.z-btn--disabled) {
        transform: scale(0.97);
    }

    &--block {
        display: flex;
        width: 100%;
    }

    &--disabled {
        opacity: 0.5;
        cursor: not-allowed;
        filter: grayscale(0.5);
    }

    /* ── Variants ───────────────────────────────────── */

    &--primary {
        background: var(--color-cta);
        color: white;
        box-shadow: 0 4px 12px color-mix(in srgb, var(--color-cta) 25%, transparent);

        &:hover:not(.z-btn--disabled) {
            background: color-mix(in srgb, var(--color-cta) 90%, black);
            box-shadow: 0 6px 16px color-mix(in srgb, var(--color-cta) 35%, transparent);
        }
    }

    &--secondary {
        background: var(--color-background);
        border-color: var(--color-border);
        color: var(--color-text);
        box-shadow: var(--shadow-sm);

        &:hover:not(.z-btn--disabled) {
            border-color: var(--color-secondary);
            background: var(--color-surface);
        }

        &.z-btn--active {
            background: var(--color-primary);
            color: white;
            border-color: var(--color-primary);
        }
    }

    &--ghost {
        background: transparent;
        color: var(--color-secondary);

        &:hover:not(.z-btn--disabled) {
            color: var(--color-text);
            background: color-mix(in srgb, var(--color-secondary) 10%, transparent);
        }

        &.z-btn--active {
            background: color-mix(in srgb, var(--color-cta) 10%, transparent);
            color: var(--color-cta);
        }
    }

    &--ghost-cta {
        background: transparent;
        color: var(--color-secondary);

        &:hover:not(.z-btn--disabled) {
            color: var(--color-cta);
            background: color-mix(in srgb, var(--color-cta) 10%, transparent);
        }

        &.z-btn--active {
            background: color-mix(in srgb, var(--color-cta) 15%, transparent);
            color: var(--color-cta);
        }
    }

    &--surface {
        background: var(--color-surface);
        border-color: var(--color-border);
        color: var(--color-secondary);

        &:hover:not(.z-btn--disabled) {
            color: var(--color-text);
            border-color: var(--color-secondary);
        }

        &.z-btn--active {
            background: var(--color-background);
            color: var(--color-cta);
            border-color: var(--color-cta);
            box-shadow: var(--shadow-sm);
        }
    }

    &--danger {
        background: color-mix(in srgb, var(--color-delete-text) 10%, transparent);
        color: var(--color-delete-text);

        &:hover:not(.z-btn--disabled) {
            background: color-mix(in srgb, var(--color-delete-text) 20%, transparent);
            border-color: var(--color-delete-text);
        }
    }

    /* ── Sizes ──────────────────────────────────────── */

    &--sm {
        padding: 4px 10px;
        font-size: 12px;
        border-radius: 6px;
    }

    &--md {
        padding: 8px 16px;
    }

    &--lg {
        padding: 10px 20px;
        font-size: 15px;
    }

    &--icon {
        width: 36px;
        height: 36px;
        padding: 0;
        border-radius: 8px;
    }

    &--icon-sm {
        width: 28px;
        height: 28px;
        padding: 0;
        border-radius: 6px;
    }
}
</style>
