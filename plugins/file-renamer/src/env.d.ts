/// <reference types="vite/client" />
/// <reference types="@ztools-center/ztools-api-types" />

/**
 * Type declaration for Vue single-file components.
 * Allows importing .vue files as modules in TypeScript.
 */
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, never>, Record<string, never>, unknown>
  export default component
}

/**
 * Interface defining the services exposed by the preload script.
 * These provide Node.js capabilities accessible from the renderer process.
 */
interface Services {
  /**
   * Renames a file from oldPath to newPath.
   * @param oldPath - Current file path
   * @param newPath - Target file path
   */
  rename: (oldPath: string, newPath: string) => Promise<void>
  /**
   * Checks if a file or directory exists at the given path.
   * @param targetPath - Path to check for existence
   * @returns Boolean indicating whether the path exists
   */
  exists: (targetPath: string) => boolean | Promise<boolean>
  /**
   * Gets file system statistics for the given path.
   * @param targetPath - Path to get statistics for
   * @returns Object containing file metadata or null if not found
   */
  getStats: (targetPath: string) => Promise<{
    isFile: boolean
    isDirectory: boolean
    size: number
    mtimeMs: number
    ctimeMs: number
    birthtimeMs: number
  }>
}

/**
 * Global window interface extension for exposing preload services.
 */
declare global {
  interface Window {
    /** Services exposed by the preload script */
    services: Services
  }
}

export {}
