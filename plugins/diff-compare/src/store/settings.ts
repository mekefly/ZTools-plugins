import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * Global settings store for the application using Pinia.
 */
export const useSettingsStore = defineStore('settings', () => {
    const autoFormat = ref(true)

    const setAutoFormat = (value: boolean) => {
        autoFormat.value = value
    }

    return {
        autoFormat,
        setAutoFormat
    }
})
