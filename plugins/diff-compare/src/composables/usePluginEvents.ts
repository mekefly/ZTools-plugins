import { shallowRef, onMounted, onUnmounted } from 'vue'

export type DiffMode = 'text' | 'image' | 'excel' | 'word' | 'pdf'

const MODE_MAP: Record<string, DiffMode> = {
    'diff-text': 'text',
    'diff-image': 'image',
    'diff-excel': 'excel',
    'diff-word': 'word',
    'diff-pdf': 'pdf',
}

export function usePluginEvents() {
    const currentMode = shallowRef<DiffMode>('text')

    const handlePluginEnter = (action: { code: string }) => {
        currentMode.value = MODE_MAP[action.code] || 'text'
    }

    onMounted(() => {
        if (window.ztools) {
            window.ztools.onPluginEnter(handlePluginEnter)
            window.ztools.onPluginOut(() => {})
        }
    })

    onUnmounted(() => {})

    return {
        currentMode
    }
}