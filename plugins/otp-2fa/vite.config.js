import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    {
      name: 'remove-crossorigin',
      transformIndexHtml(html) {
        return html.replace(/ crossorigin/g, '')
      }
    }
  ],
  base: './',
  build: {
    // 将所有资源平铺在根目录，避免子目录寻址错误
    assetsDir: '',
    modulePreload: {
      polyfill: false
    },
    assetsInlineLimit: 4096,
  }
})
