<script setup>
defineProps({
  show: { type: Boolean, default: false },
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 }
})

const emit = defineEmits(['favorite'])
</script>

<template>
  <div
    v-if="show"
    class="context-menu"
    :style="{ left: x + 'px', top: y + 'px' }"
    @click.stop
  >
    <div class="context-menu-item" @click="emit('favorite')">
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"/>
      </svg>
      <span>收藏</span>
    </div>
  </div>
</template>

<style scoped>
.context-menu {
  position: fixed;
  background: var(--bg-surface);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 4px;
  min-width: 120px;
  z-index: 2000;
  border: 1px solid var(--border-color);
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.2s;
  color: var(--text-primary);
  font-size: 14px;
}

.context-menu-item:hover {
  background: var(--bg-hover);
}

.context-menu-item svg {
  width: 16px;
  height: 16px;
  color: var(--icon-warning);
}
</style>
