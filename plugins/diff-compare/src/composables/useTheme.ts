import { shallowRef, onMounted, watch } from 'vue'

export function useTheme() {
    const isDark = shallowRef(true)

    const toggleTheme = () => {
        isDark.value = !isDark.value
        document.documentElement.classList.toggle('dark', isDark.value)
    }

    onMounted(() => {
        const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true
        isDark.value = prefersDark
        document.documentElement.classList.toggle('dark', prefersDark)
    })

    return {
        isDark,
        toggleTheme
    }
}