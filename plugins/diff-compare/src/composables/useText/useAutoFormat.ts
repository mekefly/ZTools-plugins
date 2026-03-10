import { watch, type Ref } from 'vue'
import { formatCode } from '@/utils/formatter'
import { useSettingsStore } from '@/store/settings'
import { storeToRefs } from 'pinia'

export function useAutoFormat() {
    const settingsStore = useSettingsStore()
    const { autoFormat } = storeToRefs(settingsStore)

    let sourceTimer: ReturnType<typeof setTimeout> | null = null
    let targetTimer: ReturnType<typeof setTimeout> | null = null

    const performAutoFormat = (text: Ref<string>, lang: string) => {
        if (!autoFormat.value) return

        const formatted = formatCode(text.value, lang)
        if (formatted !== text.value) {
            text.value = formatted
        }
    }

    watch(
        autoFormat,
        (enabled) => {
            if (!enabled) {
                clearTimeout(sourceTimer ?? undefined)
                clearTimeout(targetTimer ?? undefined)
            }
        }
    )

    return {
        autoFormat,
        scheduleAutoFormat: (text: Ref<string>, lang: string, side: 'source' | 'target') => {
            const timer = side === 'source' ? sourceTimer : targetTimer
            if (timer) clearTimeout(timer)

            const newTimer = setTimeout(() => performAutoFormat(text, lang), 1000)
            if (side === 'source') sourceTimer = newTimer
            else targetTimer = newTimer
        },
        immediateFormat: (text: Ref<string>, lang: string) => {
            if (!autoFormat.value) return
            setTimeout(() => performAutoFormat(text, lang), 10)
        }
    }
}