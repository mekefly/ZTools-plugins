import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

// 构建完成后把 README.md 复制到 dist/
function copyReadme() {
  return {
    name: 'copy-readme',
    closeBundle() {
      copyFileSync(
        resolve(__dirname, 'README.md'),
        resolve(__dirname, 'dist/README.md')
      )
    }
  }
}

// 构建完成后从 dist/plugin.json 中移除 development 字段
// development 字段仅用于本地开发（dev server），发布版本不应包含
function stripDevConfig() {
  return {
    name: 'strip-dev-config',
    closeBundle() {
      const pluginJsonPath = resolve(__dirname, 'dist/plugin.json')
      const config = JSON.parse(readFileSync(pluginJsonPath, 'utf-8'))
      delete config.development
      writeFileSync(pluginJsonPath, JSON.stringify(config, null, 2), 'utf-8')

      // 确保 dist/preload/vendor 存在（public/ 下的 vendor 由 Vite 自动复制）
      // 若未自动复制则手动补充
      const vendorSrc = resolve(__dirname, 'public/preload/vendor')
      const vendorDst = resolve(__dirname, 'dist/preload/vendor')
      mkdirSync(resolve(vendorDst, 'dist'), { recursive: true })
      copyFileSync(resolve(vendorSrc, 'xlsx.js'),       resolve(vendorDst, 'xlsx.js'))
      copyFileSync(resolve(vendorSrc, 'dist/cpexcel.js'), resolve(vendorDst, 'dist/cpexcel.js'))
    }
  }
}

export default defineConfig({
  plugins: [react(), copyReadme(), stripDevConfig()],
  base: './'
})
