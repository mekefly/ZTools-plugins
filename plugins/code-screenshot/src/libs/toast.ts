import { reactive } from 'vue'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: number
  message: string
  type: ToastType
  duration?: number
}

const toasts = reactive<Toast[]>([])
let nextId = 0

export const toastStore = {
  toasts,
  add(message: string, type: ToastType = 'info', duration: number = 3000) {
    const id = nextId++
    toasts.push({ id, message, type, duration })

    if (duration > 0) {
      setTimeout(() => {
        this.remove(id)
      }, duration)
    }
    return id
  },
  remove(id: number) {
    const index = toasts.findIndex(t => t.id === id)
    if (index !== -1) {
      toasts.splice(index, 1)
    }
  },
  success(msg: string, duration?: number) { return this.add(msg, 'success', duration) },
  error(msg: string, duration?: number) { return this.add(msg, 'error', duration) },
  info(msg: string, duration?: number) { return this.add(msg, 'info', duration) },
  warning(msg: string, duration?: number) { return this.add(msg, 'warning', duration) }
}

export function useToast() {
  return toastStore
}
