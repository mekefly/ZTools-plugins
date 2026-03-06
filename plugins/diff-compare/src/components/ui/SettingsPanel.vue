<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ZSelect from './base/ZSelect.vue'
import { useSettingsStore } from '@/store/settings'
import { storeToRefs } from 'pinia'

const { locale, t } = useI18n()
const settingsStore = useSettingsStore()
const { autoFormat } = storeToRefs(settingsStore)

const emit = defineEmits(['close'])

const langOptions = ref([
    { label: '中文', value: 'zh' },
    { label: 'English', value: 'en' }
])

const usageItems = computed(() => {
    const zh = [
        {
            title: '文本对比',
            desc: '分别在两侧面板输入原始内容和修改后内容，系统自动实时高亮增删差异行。',
        },
        {
            title: '图片对比',
            desc: '上传两张图片后，左右拖动居中滑块即可叠加对比，精准发现细微差异。',
        },
        {
            title: '主题切换',
            desc: '点击右上角图标在暗色与亮色模式间切换，适应不同工作环境。',
        },
        {
            title: '语言设置',
            desc: '在下方选择框中切换显示语言，当前支持中文与英文。',
        },
    ]
    const en = [
        {
            title: 'Text Compare',
            desc: 'Paste source and target content on both sides — differences are highlighted in real-time.',
        },
        {
            title: 'Image Compare',
            desc: 'Upload two images, then drag the center slider to overlay and compare them precisely.',
        },
        {
            title: 'Theme',
            desc: 'Click the top-right icon to switch between dark and light mode to suit your environment.',
        },
        {
            title: 'Language',
            desc: 'Use the selector below to switch the display language between Chinese and English.',
        },
    ]
    return locale.value === 'zh' ? zh : en
})

const autoFormatValue = computed({
    get: () => autoFormat.value ? 'true' : 'false',
    set: (v) => { autoFormat.value = v === 'true' }
})

const formatOptions = computed(() => [
    { label: t('enabled'), value: 'true' },
    { label: t('disabled'), value: 'false' }
])
</script>

<template>
    <!-- overlay -->
    <div class="sp-overlay" @mousedown.self="emit('close')">
        <!-- panel -->
        <transition name="sp-slide" appear>
            <aside class="sp-panel">

                <!-- ── Header ── -->
                <header class="sp-header">
                    <div class="sp-header-title">
                        <!-- Settings gear icon -->
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                            class="sp-header-icon">
                            <path
                                d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                            <circle cx="12" cy="12" r="3" />
                        </svg>
                        <span>{{ locale === 'zh' ? '设置' : 'Settings' }}</span>
                    </div>
                    <button class="sp-close" @click="emit('close')" :title="locale === 'zh' ? '关闭' : 'Close'">
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </header>

                <!-- ── Scrollable body ── -->
                <div class="sp-body">

                    <!-- Language section -->
                    <section class="sp-section">
                        <p class="sp-section-label">
                            {{ locale === 'zh' ? '显示语言' : 'Display Language' }}
                        </p>
                        <ZSelect v-model="locale" :options="langOptions" />
                    </section>

                    <!-- Auto Format section -->
                    <section class="sp-section">
                        <p class="sp-section-label">
                            {{ t('autoFormat') }}
                        </p>
                        <ZSelect v-model="autoFormatValue" :options="formatOptions" />
                    </section>

                    <div class="sp-divider"></div>

                    <!-- Usage guide section -->
                    <section class="sp-section">
                        <p class="sp-section-label">
                            {{ locale === 'zh' ? '使用说明' : 'How to Use' }}
                        </p>
                        <div class="sp-guide-list">

                            <!-- Text Compare -->
                            <div class="sp-guide-item">
                                <div class="sp-guide-icon-wrap sp-guide-icon-wrap--blue">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
                                        fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                                        stroke-linejoin="round">
                                        <polyline points="16 18 22 12 16 6" />
                                        <polyline points="8 6 2 12 8 18" />
                                    </svg>
                                </div>
                                <div class="sp-guide-text">
                                    <p class="sp-guide-title">{{ usageItems[0].title }}</p>
                                    <p class="sp-guide-desc">{{ usageItems[0].desc }}</p>
                                </div>
                            </div>

                            <!-- Image Compare -->
                            <div class="sp-guide-item">
                                <div class="sp-guide-icon-wrap sp-guide-icon-wrap--purple">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
                                        fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                                        stroke-linejoin="round">
                                        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                                        <circle cx="9" cy="9" r="2" />
                                        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                                    </svg>
                                </div>
                                <div class="sp-guide-text">
                                    <p class="sp-guide-title">{{ usageItems[1].title }}</p>
                                    <p class="sp-guide-desc">{{ usageItems[1].desc }}</p>
                                </div>
                            </div>

                            <!-- Theme -->
                            <div class="sp-guide-item">
                                <div class="sp-guide-icon-wrap sp-guide-icon-wrap--amber">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
                                        fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                                        stroke-linejoin="round">
                                        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                                    </svg>
                                </div>
                                <div class="sp-guide-text">
                                    <p class="sp-guide-title">{{ usageItems[2].title }}</p>
                                    <p class="sp-guide-desc">{{ usageItems[2].desc }}</p>
                                </div>
                            </div>

                            <!-- Language -->
                            <div class="sp-guide-item">
                                <div class="sp-guide-icon-wrap sp-guide-icon-wrap--green">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
                                        fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                                        stroke-linejoin="round">
                                        <path d="m5 8 6 6" />
                                        <path d="m4 14 6-6 2-3" />
                                        <path d="M2 5h12" />
                                        <path d="M7 2h1" />
                                        <path d="m22 22-5-10-5 10" />
                                        <path d="M14 18h6" />
                                    </svg>
                                </div>
                                <div class="sp-guide-text">
                                    <p class="sp-guide-title">{{ usageItems[3].title }}</p>
                                    <p class="sp-guide-desc">{{ usageItems[3].desc }}</p>
                                </div>
                            </div>

                        </div>
                    </section>
                </div>

                <!-- ── Footer ── -->
                <footer class="sp-footer">
                    <span>diff-compare</span>
                    <span class="sp-footer-dot">·</span>
                    <span>ZTools Plugin</span>
                </footer>
            </aside>
        </transition>
    </div>
</template>

<style scoped lang="scss">
/* ── Overlay ──────────────────────────────────────────── */
.sp-overlay {
    position: fixed;
    inset: 0;
    z-index: 200;
    background: rgba(0, 0, 0, 0.35);
    backdrop-filter: blur(3px);
    display: flex;
    justify-content: flex-end;
}

/* ── Panel ────────────────────────────────────────────── */
.sp-panel {
    width: 320px;
    height: 100%;
    background: var(--color-background);
    border-left: 1px solid var(--color-border);
    display: flex;
    flex-direction: column;
    box-shadow: -8px 0 32px rgba(0, 0, 0, 0.18);
    overflow: hidden;
}

/* ── Header ───────────────────────────────────────────── */
.sp-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 18px;
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
}

.sp-header-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 600;
    color: var(--color-text);
}

.sp-header-icon {
    color: var(--color-secondary);
}

.sp-close {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    border: none;
    background: transparent;
    color: var(--color-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 150ms ease, color 150ms ease;

    &:hover {
        background: var(--color-border);
        color: var(--color-text);
    }
}

.sp-body {
    flex: 1;
    overflow-y: auto;
    padding: 20px 18px;
    display: flex;
    flex-direction: column;
    gap: 20px;

    &::-webkit-scrollbar {
        width: 4px;
    }

    &::-webkit-scrollbar-track {
        background: transparent;
    }

    &::-webkit-scrollbar-thumb {
        background: var(--color-border);
        border-radius: 4px;
    }
}

/* ── Section ──────────────────────────────────────────── */
.sp-section {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.sp-section-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-secondary);
    margin: 0;
}

.sp-divider {
    height: 1px;
    background: var(--color-border);
}

/* ── Guide List ───────────────────────────────────────── */
.sp-guide-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.sp-guide-item {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    padding: 10px 12px;
    border-radius: 10px;
    transition: background 150ms ease;

    &:hover {
        background: color-mix(in srgb, var(--color-border) 50%, transparent);
    }
}

/* ── Icon wrap (colored badge) ────────────────────────── */
.sp-guide-icon-wrap {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 1px;

    &--blue {
        background: rgba(59, 130, 246, 0.15);
        color: #3b82f6;
    }

    &--purple {
        background: rgba(139, 92, 246, 0.15);
        color: #8b5cf6;
    }

    &--amber {
        background: rgba(245, 158, 11, 0.15);
        color: #f59e0b;
    }

    &--green {
        background: rgba(16, 185, 129, 0.15);
        color: #10b981;
    }
}

/* ── Guide Text ───────────────────────────────────────── */
.sp-guide-text {
    flex: 1;
}

.sp-guide-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--color-text);
    margin: 0 0 3px;
    line-height: 1.4;
}

.sp-guide-desc {
    font-size: 12px;
    color: var(--color-secondary);
    margin: 0;
    line-height: 1.55;
}

/* ── Footer ───────────────────────────────────────────── */
.sp-footer {
    padding: 10px 18px;
    border-top: 1px solid var(--color-border);
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: var(--color-secondary);
    flex-shrink: 0;
    opacity: 0.6;
}

.sp-footer-dot {
    opacity: 0.5;
}

/* ── Slide transition ─────────────────────────────────── */
.sp-slide-enter-active {
    transition: transform 280ms cubic-bezier(0.16, 1, 0.3, 1), opacity 200ms ease;
}

.sp-slide-leave-active {
    transition: transform 200ms ease, opacity 160ms ease;
}

.sp-slide-enter-from {
    transform: translateX(100%);
    opacity: 0;
}

.sp-slide-leave-to {
    transform: translateX(100%);
    opacity: 0;
}
</style>
