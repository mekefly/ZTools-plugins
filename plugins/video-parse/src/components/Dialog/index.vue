<script setup>
// 定义 Props
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: '提示'
  },
  width: {
    type: String,
    default: '340px' // 默认 max-w-sm
  },
  confirmText: {
    type: String,
    default: '确认'
  }
})

// 定义 Events
const emit = defineEmits(['update:visible', 'confirm'])

// 关闭弹窗
const handleClose = () => {
  emit('update:visible', false)
}

// 确认按钮点击
const handleConfirm = () => {
  emit('confirm')
}
</script>

<template>
  <Transition name="fade">
    <div 
      v-if="visible" 
      class="dialog-overlay"
      @click.self="handleClose"
    >
      <div class="dialog-content" :style="{ maxWidth: width }">
        
        <!-- Header -->
        <div class="dialog-header">
          <h3 class="header-title">
            <!-- 具名插槽：如果不传 icon，只显示标题 -->
            <slot name="icon"></slot>
            {{ title }}
          </h3>
          <button 
            @click="handleClose" 
            class="btn-close"
          >×</button>
        </div>

        <!-- Body: 默认插槽 -->
        <div class="dialog-body">
          <slot></slot>
        </div>

        <!-- Footer: 具名插槽，提供默认按钮 -->
        <div class="dialog-footer">
          <slot name="footer">
            <button 
              @click="handleConfirm" 
              class="btn-confirm"
            >
              {{ confirmText }}
            </button>
          </slot>
        </div>

      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* 动画 */
.fade-enter-active,
.fade-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

.fade-enter-to,
.fade-leave-from {
  opacity: 1;
  transform: scale(1);
}

/* 遮罩层 */
.dialog-overlay {
  position: absolute;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(15, 23, 42, 0.5);
}

/* 弹窗主体 */
.dialog-content {
  background-color: white;
  border-radius: 5px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  width: 100%;
  /* max-width 由 props 控制，默认 24rem */
  border: 1px solid #f3f4f6;
  overflow: hidden;
}

/* 头部 */
.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px;
  border-bottom: 1px solid #f9fafb;
  background-color: rgba(249, 250, 251, 0.5);
}

.header-title {
  font-weight: 600;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 15px;
  margin: 0;
}

.btn-close {
  color: #94a3b8;
  width: 20px;
  height: 20px;
  padding: 5px;
  border-radius: 50%;
  transition: color 0.2s, background-color 0.2s;
  background: transparent;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.btn-close:hover {
  color: #475569;
  background-color: #f3f4f6;
}

/* 内容区 */
.dialog-body {
  padding: 20px 10px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 底部 */
.dialog-footer {
  padding: 10px;
  background-color: #f9fafb;
  border-top: 1px solid #f3f4f6;
}

.btn-confirm {
  width: 100%;
  padding-top: 10px;
  padding-bottom: 10px;
  background-color: #0f172a;
  color: white;
  border-radius: 5px;
  font-size: 14px;
  font-weight: 500;
  transition: background-color 0.2s, transform 0.1s;
  border: none;
  cursor: pointer;
}

.btn-confirm:hover {
  background-color: #1e293b;
}

.btn-confirm:active {
  transform: scale(0.98);
}
</style>