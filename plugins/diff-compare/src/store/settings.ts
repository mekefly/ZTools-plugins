import { defineStore } from 'pinia'
import { shallowRef } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
    const autoFormat = shallowRef(true)

    const setAutoFormat = (value: boolean) => {
        autoFormat.value = value
    }

    return {
        autoFormat,
        setAutoFormat
    }
})
