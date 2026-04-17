# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

ZTools 个人工具箱插件，包含多个随机生成工具（身份、密码、数字、UUID、颜色、签名等）。技术栈：Vue 3 + Vite + TypeScript + Element Plus。ZTools 是一个启动器应用，插件扩展其功能。

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Dev server at http://localhost:5173 (auto-loaded by ZTools)
npm run build        # Type-check with vue-tsc, then build to dist/
```

No test or lint scripts. TypeScript is relaxed (`strict: false`, `noImplicitAny: false`).

## Architecture

### 项目结构

```
src/
├── App.vue                    # 根组件 + 手动路由 + ZTools 生命周期
├── main.ts                    # Vue 入口，注册 Element Plus 及图标
├── main.css                   # 全局样式、CSS 变量、明暗主题
├── env.d.ts                   # 类型声明（Services 接口、ZTools API）
├── toolbox/
│   ├── ToolboxLayout.vue      # 侧边栏 + 内容区布局（主 UI 框架）
│   └── tools.ts               # 工具注册表（categories 数组 + toolMap）
├── tools/                     # 工具组件（侧边栏路由）
│   ├── Identity/index.vue     # 随机身份信息生成（16 个字段，支持批量/导出）
│   ├── RandomPassword/index.vue  # 随机密码生成（可配置长度/字符集/强度）
│   ├── RandomNumber/index.vue    # 范围随机数（可配置数量/小数位）
│   ├── UUID/index.vue            # UUID v4 生成
│   └── RandomColor/index.vue     # HSL 随机颜色（滑块/多格式复制/历史记录）
│   └── Signature/index.vue       # 加密签名生成（MD5/SHA/HMAC）
public/
├── plugin.json                # 插件清单（必须编辑此文件，根目录的是旧副本）
├── logo.png                   # 插件图标
└── preload/
    ├── package.json           # CommonJS 模块声明
    └── services.js            # Node.js 桥接：readFile / writeTextFile / writeImageFile
```

### 路由系统（手动，无 Vue Router）

`App.vue` 将 `route` 设为 `'toolbox'`，由 `ToolboxLayout` 渲染侧边栏。工具通过 `src/toolbox/tools.ts` 中的 `categories` 数组注册，`toolMap`（Map）做 code → Tool 的 O(1) 查找。当前工具通过 `shallowRef` + `<component :is>` 动态渲染。

**`setRoute(action)` 逻辑**：查 toolMap → fallback 到第一个工具（Identity）。

### 添加新工具的步骤

1. 在 `src/tools/<ToolName>/index.vue` 创建组件
2. 在 `src/toolbox/tools.ts` 的 `categories` 数组中注册（导入组件，定义 code/explain/icon）
3. 在 `public/plugin.json` 的 features 数组中添加匹配条目（code + cmds）
4. 如需 Node.js 能力，在 `public/preload/services.js` 添加方法，通过 `window.services` 调用

### Plugin Manifest (`public/plugin.json`)

每个 feature 的 `code` 对应路由 key。Cmd 类型：
- 普通字符串 → ZTools 搜索栏文本触发
- `{ type: "files" }` → 文件拖拽触发
- `{ type: "over" }` → 选中文本浮层触发
- `{ type: "img" }` → 图片触发

### Preload / Node.js Bridge

`public/preload/services.js`（CommonJS，由 `public/preload/package.json` 声明）暴露在 `window.services` 上。当前方法：`readFile()`、`writeTextFile()`、`writeImageFile()`。

### ZTools API

`window.ztools`（类型由 `@ztools-center/ztools-api-types` 提供）提供宿主集成：剪贴板、对话框、通知、窗口管理、Shell 操作等。详见 `src/env.d.ts`。

## Styling 约定

- 全局 CSS 变量：`--blue`、`--light`（定义在 `src/main.css`）
- 明暗主题：`@media (prefers-color-scheme: dark)`，各组件独立声明
- 组件统一使用 `<style scoped>`
- 强调色 `#667eea`（明）/ `#8ba4f7`（暗），贯穿所有工具组件
- 数据展示使用等宽字体（Consolas / Courier New）
- UI 框架：Element Plus（全局注册）+ `@element-plus/icons-vue`（全量注册图标）

## 开发注意事项

- **始终编辑 `public/plugin.json`**，根目录的 `plugin.json` 是过时副本
- `copyText` 模式在各工具组件中重复实现（先尝试 `window.ztools?.copyText`，fallback 到 `navigator.clipboard.writeText()`），未提取为公共工具函数
- `ztools-doc-helper/` 目录是 ZTools 插件开发参考文档，不参与构建
- 开发模式（无 ZTools 宿主）会显示 dev hint 并默认加载 Identity 工具
- `App.vue` 通过 `onMounted` 检测环境：有 `window.ztools` 时注册 `onPluginEnter`/`onPluginOut` 并调用 `setExpendHeight(600)`；无时进入 dev 模式
