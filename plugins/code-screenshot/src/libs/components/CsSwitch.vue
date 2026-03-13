<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const toggle = () => {
  if (!props.disabled) emit('update:modelValue', !props.modelValue)
}
</script>

<template>
  <button
    class="cs-switch"
    :class="{ 'is-active': modelValue, 'is-disabled': disabled }"
    :disabled="disabled"
    @click="toggle"
    type="button"
    role="switch"
    :aria-checked="modelValue"
  >
    <span class="cs-switch-knob"></span>
  </button>
</template>

<style lang="scss" scoped>

.cs-switch {
  width: 40px;
  height: 22px;
  background: var(--color-toggle-bg);
  border: 1px solid var(--color-toggle-border);
  border-radius: 11px;
  position: relative;
  cursor: pointer;
  padding: 0;
  outline: none;
  transition:
    background-color 0.25s ease,
    border-color 0.25s ease,
    box-shadow 0.25s ease;
  box-shadow: var(--color-toggle-shadow);

  &:focus-visible {
    box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.5);
  }

  &:hover:not(.is-active):not(.is-disabled) {
    background: color-mix(in srgb, var(--color-toggle-bg) 90%, white 10%);
  }

  &.is-active {
    background: var(--color-switch-active);
    border-color: var(--color-switch-active-border);
    box-shadow: 0 0 8px rgba(56, 189, 248, 0.3);

    .cs-switch-knob {
      transform: translateX(18px);
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
    }
  }

  &.is-disabled {
    opacity: 0.4;
    cursor: not-allowed;
    pointer-events: none;
  }
}

.cs-switch-knob {
  position: absolute;
  top: 1px;
  left: 1px;
  width: 18px;
  height: 18px;
  background: var(--color-toggle-knob);
  border-radius: var(--radius-full);
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: var(--color-toggle-knob-shadow);
}
</style>
