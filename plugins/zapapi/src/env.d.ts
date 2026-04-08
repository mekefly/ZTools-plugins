/// <reference types="vite/client" />
/// <reference types="@ztools-center/ztools-api-types" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, never>, Record<string, never>, unknown>
  export default component
}

interface Services {
  readFile: (file: string) => string
  writeTextFile: (text: string, filename?: string) => string
  writeImageFile: (base64Url: string) => string | undefined
}

interface ZToolsApiExtended {
  showTip: (msg: string) => void
  hideMainWindow: () => void
  getClipboardContent: () => Promise<string>
  getPath: (name: string) => string
  onPluginOut: (cb: () => void) => void
}

declare global {
  interface Window {
    services: Services
    ztools: ZToolsApiExtended
  }
}

export {}
