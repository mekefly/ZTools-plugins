import { createI18n } from 'vue-i18n'
import zh from './locales/zh'
import en from './locales/en'

// Define the message schema for type safety
export type MessageSchema = typeof zh

const i18n = createI18n({
  legacy: false, // Use Composition API
  locale: 'zh',
  fallbackLocale: 'en',
  messages: {
    zh,
    en
  }
})

export default i18n
