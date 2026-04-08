<template>
  <div class="ui-select" :class="{ 'ui-select--disabled': disabled, 'ui-select--open': isOpen }">
    <div
      class="ui-select__trigger"
      :tabindex="disabled ? -1 : 0"
      @click="!disabled && toggle()"
      @keydown.enter="!disabled && toggle()"
      @keydown.space.prevent="!disabled && toggle()"
      @keydown.escape="close()"
      @keydown.down.prevent="!disabled && navigate(1)"
      @keydown.up.prevent="!disabled && navigate(-1)"
    >
      <span class="ui-select__value" :class="{ 'ui-select__value--placeholder': !selectedLabel }">
        <span v-if="selectedOption?.icon" class="ui-select__icon" v-html="selectedOption.icon"></span>
        {{ selectedLabel || placeholder }}
      </span>
      <svg class="ui-select__chevron" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </div>
    <Teleport to="body">
      <div
        v-if="isOpen"
        class="ui-select__dropdown"
        :style="dropdownStyle"
        @mousedown.prevent
      >
        <div
          v-for="(option, index) in options"
          :key="option.value"
          class="ui-select__option"
          :class="{ 'ui-select__option--selected': modelValue === option.value, 'ui-select__option--focused': focusedIndex === index }"
          @click="select(option.value)"
          @mouseenter="focusedIndex = index"
        >
          <span class="ui-select__option-label">
            <span v-if="option.icon" class="ui-select__icon" v-html="option.icon"></span>
            <span>{{ option.label }}</span>
          </span>
          <svg v-if="modelValue === option.value" class="ui-select__check" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'

interface Option {
  label: string
  value: string | number | null
  icon?: string
}

const props = withDefaults(defineProps<{
  modelValue: string | number | null
  options: Option[]
  placeholder?: string
  disabled?: boolean
}>(), {
  placeholder: ''
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number | null]
}>()

const isOpen = ref(false)
const focusedIndex = ref(0)
const dropdownStyle = ref<Record<string, string>>({})

const selectedLabel = computed(() => {
  const found = props.options.find((o) => o.value === props.modelValue)
  return found ? found.label : ''
})

const selectedOption = computed(() => {
  return props.options.find((o) => o.value === props.modelValue) || null
})

function toggle() {
  isOpen.value ? close() : open()
}

function open() {
  isOpen.value = true
  const idx = props.options.findIndex((o) => o.value === props.modelValue)
  focusedIndex.value = idx >= 0 ? idx : 0
  updateDropdownPosition()
}

function close() {
  isOpen.value = false
}

function select(value: string | number | null) {
  emit('update:modelValue', value)
  close()
}

function navigate(direction: number) {
  if (!isOpen.value) { open(); return }
  const newIndex = focusedIndex.value + direction
  if (newIndex >= 0 && newIndex < props.options.length) {
    focusedIndex.value = newIndex
  }
}

function updateDropdownPosition() {
  const el = document.querySelector('.ui-select--open .ui-select__trigger')
  if (el) {
    const rect = el.getBoundingClientRect()
    dropdownStyle.value = {
      position: 'fixed',
      top: `${rect.bottom + 4}px`,
      left: `${rect.left}px`,
      width: `${Math.max(rect.width, 160)}px`,
      zIndex: '9999'
    }
  }
}

function handleClickOutside(e: MouseEvent) {
  if (isOpen.value) {
    const target = e.target as HTMLElement
    if (!target.closest('.ui-select') && !target.closest('.ui-select__dropdown')) {
      close()
    }
  }
}

watch(isOpen, (val) => {
  if (val) {
    setTimeout(updateDropdownPosition, 0)
    window.addEventListener('click', handleClickOutside)
    window.addEventListener('resize', updateDropdownPosition)
    window.addEventListener('scroll', updateDropdownPosition, true)
  } else {
    window.removeEventListener('click', handleClickOutside)
    window.removeEventListener('resize', updateDropdownPosition)
    window.removeEventListener('scroll', updateDropdownPosition, true)
  }
})

onUnmounted(() => {
  window.removeEventListener('click', handleClickOutside)
  window.removeEventListener('resize', updateDropdownPosition)
  window.removeEventListener('scroll', updateDropdownPosition, true)
})
</script>

<style scoped>
.ui-select {
  position: relative;
  display: inline-flex;
}

.ui-select__trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
  padding: 5px 10px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-color);
  background: var(--input-bg);
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-base);
  outline: none;
  min-height: 30px;
}

.ui-select__trigger:hover:not(.ui-select--disabled) {
  border-color: var(--border-color-hover);
}

.ui-select__trigger:focus-visible {
  border-color: var(--border-active);
  box-shadow: 0 0 12px var(--accent-glow);
}

.ui-select--open .ui-select__trigger {
  border-color: var(--border-active);
  box-shadow: 0 0 12px var(--accent-glow);
}

.ui-select__value {
  flex: 1;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ui-select__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 12px;
  height: 12px;
  flex-shrink: 0;
  opacity: 0.85;
}

.ui-select__icon :deep(svg) {
  width: 12px;
  height: 12px;
  display: block;
}

.ui-select__value--placeholder {
  color: var(--text-muted);
}

.ui-select__chevron {
  flex-shrink: 0;
  transition: transform var(--transition-base);
  color: var(--text-secondary);
}

.ui-select--open .ui-select__chevron {
  transform: rotate(180deg);
}

.ui-select--disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.ui-select--disabled .ui-select__trigger {
  cursor: not-allowed;
}
</style>

<style>
.ui-select__dropdown {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: 4px;
  max-height: 240px;
  overflow-y: auto;
  box-shadow: var(--shadow-lg);
  animation: dropdownIn 0.15s ease;
}

@keyframes dropdownIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

.ui-select__option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  color: var(--text-primary);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.ui-select__option-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.ui-select__option:hover,
.ui-select__option--focused {
  background: var(--bg-elevated);
}

.ui-select__option--selected {
  color: var(--accent-primary);
  font-weight: 500;
}

.ui-select__check {
  flex-shrink: 0;
}
</style>
