<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import mammoth from 'mammoth'
import ZBadge from '@/components/ui/base/ZBadge.vue'
import ZButton from '@/components/ui/base/ZButton.vue'
import ZTooltip from '@/components/ui/base/ZTooltip.vue'
import FileDropzone from '@/components/shared/FileDropzone.vue'
import DiffBar from '@/components/shared/DiffBar.vue'
import DiffLegend from '@/components/shared/DiffLegend.vue'
import PrevNextButtons from '@/components/shared/PrevNextButtons.vue'
import { TextDiffStrategy } from '@/core/diff/text/myers'

const { t } = useI18n()

interface ParagraphBlock {
    type: 'equal' | 'delete' | 'insert' | 'modified'
    sourceText: string
    targetText: string
    sourceHtml?: string
    targetHtml?: string
}

const sourceHtml = ref('')
const targetHtml = ref('')
const sourceFileName = ref('')
const targetFileName = ref('')
const loading = ref(false)
const loadError = ref('')

const bothLoaded = computed(() => !!sourceHtml.value && !!targetHtml.value)

// 从 HTML 中提取段落（按 p、h1-h6、li 等块级元素）
function extractParagraphs(html: string): { texts: string[]; htmls: string[] } {
    if (!html.trim()) return { texts: [], htmls: [] }
    const div = document.createElement('div')
    div.innerHTML = html
    const blocks = div.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li')
    const texts: string[] = []
    const htmls: string[] = []
    blocks.forEach((el) => {
        const text = (el.textContent || '').trim()
        const h = el.outerHTML
        texts.push(text)
        htmls.push(h)
    })
    if (texts.length === 0 && html.trim()) {
        texts.push(div.textContent?.trim() || '')
        htmls.push(div.innerHTML)
    }
    return { texts, htmls }
}

const textDiff = new TextDiffStrategy()

const paragraphBlocks = computed<ParagraphBlock[]>(() => {
    if (!sourceHtml.value || !targetHtml.value) return []

    const src = extractParagraphs(sourceHtml.value)
    const tgt = extractParagraphs(targetHtml.value)

    const result = textDiff.compute(
        src.texts.join('\n'),
        tgt.texts.join('\n')
    )

    const blocks: ParagraphBlock[] = []
    let srcIdx = 0
    let tgtIdx = 0

    for (const chunk of result.chunks) {
        const lines = (chunk.value || '').split('\n')
        const lines2 = (chunk.value2 ?? '').split('\n')

        if (chunk.type === 'equal') {
            for (let i = 0; i < lines.length; i++) {
                blocks.push({
                    type: 'equal',
                    sourceText: lines[i] ?? '',
                    targetText: lines[i] ?? '',
                    sourceHtml: src.htmls[srcIdx + i],
                    targetHtml: tgt.htmls[tgtIdx + i]
                })
            }
            srcIdx += lines.length
            tgtIdx += lines.length
        } else if (chunk.type === 'delete') {
            for (const line of lines) {
                blocks.push({
                    type: 'delete',
                    sourceText: line,
                    targetText: '',
                    sourceHtml: src.htmls[srcIdx]
                })
                srcIdx++
            }
        } else if (chunk.type === 'insert') {
            for (const line of lines) {
                blocks.push({
                    type: 'insert',
                    sourceText: '',
                    targetText: line,
                    targetHtml: tgt.htmls[tgtIdx]
                })
                tgtIdx++
            }
        } else if (chunk.type === 'modified') {
            const maxLen = Math.max(lines.length, lines2.length)
            for (let i = 0; i < maxLen; i++) {
                blocks.push({
                    type: 'modified',
                    sourceText: lines[i] ?? '',
                    targetText: lines2[i] ?? '',
                    sourceHtml: src.htmls[srcIdx + i],
                    targetHtml: tgt.htmls[tgtIdx + i]
                })
            }
            srcIdx += lines.length
            tgtIdx += lines2.length
        }
    }

    return blocks
})

const diffCount = computed(() => {
    return paragraphBlocks.value.filter(b => b.type !== 'equal').length
})

const readFile = (file: File): Promise<ArrayBuffer> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target?.result as ArrayBuffer)
        reader.onerror = () => reject(new Error('Failed to read file'))
        reader.readAsArrayBuffer(file)
    })

const handleFile = async (e: Event, side: 'source' | 'target') => {
    const input = e.target as HTMLInputElement
    const files = input.files
    if (!files || files.length === 0) return

    loading.value = true
    loadError.value = ''
    try {
        if (files.length >= 2) {
            const [buf1, buf2] = await Promise.all([
                readFile(files[0]),
                readFile(files[1])
            ])
            const [r1, r2] = await Promise.all([
                mammoth.convertToHtml({ arrayBuffer: buf1 }),
                mammoth.convertToHtml({ arrayBuffer: buf2 })
            ])
            sourceHtml.value = r1.value
            targetHtml.value = r2.value
            sourceFileName.value = files[0].name
            targetFileName.value = files[1].name
        } else {
            const buf = await readFile(files[0])
            const result = await mammoth.convertToHtml({ arrayBuffer: buf })
            if (side === 'source') {
                sourceHtml.value = result.value
                sourceFileName.value = files[0].name
            } else {
                targetHtml.value = result.value
                targetFileName.value = files[0].name
            }
        }
    } catch (err) {
        loadError.value = (err as Error).message || t('wordLoadFailed')
    } finally {
        loading.value = false
        input.value = ''
    }
}

const clearItems = () => {
    sourceHtml.value = ''
    targetHtml.value = ''
    sourceFileName.value = ''
    targetFileName.value = ''
    loadError.value = ''
}

const handlePaste = async (e: ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return

    const files: File[] = []
    for (let i = 0; i < items.length; i++) {
        if (items[i].kind === 'file') {
            const file = items[i].getAsFile()
            if (file && /\.docx?$/i.test(file.name)) files.push(file)
        }
    }

    if (files.length === 0) return
    loading.value = true
    loadError.value = ''
    try {
        if (files.length >= 2) {
            const [buf1, buf2] = await Promise.all([
                readFile(files[0]),
                readFile(files[1])
            ])
            const [r1, r2] = await Promise.all([
                mammoth.convertToHtml({ arrayBuffer: buf1 }),
                mammoth.convertToHtml({ arrayBuffer: buf2 })
            ])
            sourceHtml.value = r1.value
            targetHtml.value = r2.value
            sourceFileName.value = files[0].name
            targetFileName.value = files[1].name
        } else {
            const buf = await readFile(files[0])
            const result = await mammoth.convertToHtml({ arrayBuffer: buf })
            if (sourceHtml.value) {
                targetHtml.value = result.value
                targetFileName.value = files[0].name
            } else {
                sourceHtml.value = result.value
                sourceFileName.value = files[0].name
            }
        }
    } catch (err) {
        loadError.value = (err as Error).message || t('wordLoadFailed')
    } finally {
        loading.value = false
    }
}

// 滚动同步
const leftPanelRef = ref<HTMLElement | null>(null)
const rightPanelRef = ref<HTMLElement | null>(null)
const diffBarRef = ref<HTMLElement | null>(null)
const activeBlockIdx = ref(-1)
let isProgrammaticScroll = false

const scrollToBlock = (idx: number) => {
    console.log('scrollToBlock', idx)
    activeBlockIdx.value = idx
    const left = leftPanelRef.value
    const right = rightPanelRef.value
    const bar = diffBarRef.value
    if (!left || !right || !bar) return

    isProgrammaticScroll = true
    // 获取两个目标元素
    const sourceEl = left.querySelector(`#source-${idx}`);
    const targetEl = right.querySelector(`#target-${idx}`);
    const barEl = ((bar as any)?.scrollContainer as HTMLElement)?.querySelector(`#diff-bar-item-${idx}`);

    // 使用 requestAnimationFrame 确保在同一帧中处理滚动
    requestAnimationFrame(() => {
        // 先禁用平滑滚动，手动控制滚动动画
        sourceEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        targetEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        barEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => { isProgrammaticScroll = false }, 500)
    });
}

const goToNextDiff = () => {
    // 获取所有差异块的索引
    const diffs = paragraphBlocks.value.map((b, i) => (b.type !== 'equal' ? i : -1)).filter((i) => i >= 0)
    if (diffs.length === 0) return
    // 获取当前差异块的索引
    const curr = diffs.findIndex((i) => i === activeBlockIdx.value)
    // 获取下一个差异块的索引
    const next = (curr + 1) % diffs.length
    // 滚动到下一个差异块
    scrollToBlock(diffs[next])
}

const goToPrevDiff = () => {
    // 获取所有差异块的索引
    const diffs = paragraphBlocks.value.map((b, i) => (b.type !== 'equal' ? i : -1)).filter((i) => i >= 0)
    if (diffs.length === 0) return
    // 获取当前差异块的索引
    const curr = diffs.findIndex((i) => i === activeBlockIdx.value)
    // 获取上一个差异块的索引
    const prev = curr <= 0 ? diffs.length - 1 : curr - 1
    // 滚动到上一个差异块
    scrollToBlock(diffs[prev])
}

let activeScrollTarget: HTMLElement | null = null

onMounted(() => {
    window.addEventListener('paste', handlePaste)
})

onUnmounted(() => {
    window.removeEventListener('paste', handlePaste)
})
</script>

<template>
    <div class="word-root flex flex-col h-full overflow-hidden">
        <!-- Toolbar: 左文件名 | 中间差异 | 右文件名 -->
        <div
            class="h-11 border-b border-[var(--color-border)] bg-[var(--color-background)] flex items-center gap-3 px-4 flex-shrink-0 z-30 shadow-sm">
            <!-- 左侧：源文件名 -->
            <div class="w-[180px] min-w-0 flex items-center gap-2 flex-shrink-0">
                <ZBadge v-if="sourceFileName" :title="sourceFileName" variant="surface" size="lg">{{ sourceFileName }}
                </ZBadge>
                <ZBadge v-else :title="t('wordSource')" variant="surface" size="lg">{{ t('wordSource') }}</ZBadge>
            </div>

            <!-- 中间：差异数量 + 导航 + 清空 -->
            <div class="flex-1 flex items-center justify-center gap-2 min-w-0">
                <template v-if="bothLoaded">
                    <div v-if="diffCount > 0"
                        class="flex items-center gap-1.5 bg-[var(--color-surface)] rounded-md border border-[var(--color-border)] px-2 py-1">
                        <span class="text-xs font-medium text-[var(--color-cta)] cursor-pointer hover:underline"
                            @click="goToNextDiff">
                            {{ t('wordDiffCount', { n: diffCount }) }}
                        </span>
                        <PrevNextButtons :prev-label="t('prevChange')" :next-label="t('nextChange')"
                            @prev="goToPrevDiff" @next="goToNextDiff" />
                    </div>
                    <span v-else class="text-xs text-[var(--color-secondary)]">{{ t('wordNoDiff') }}</span>
                </template>
                <span v-else class="text-xs text-[var(--color-secondary)] opacity-60">{{ t('wordDiffEmptyHint')
                }}</span>
                <ZTooltip :content="t('clearItems')" v-if="bothLoaded">
                    <ZButton variant="ghost" size="icon-sm" @click="clearItems"
                        class="!w-6 !h-6 text-[var(--color-secondary)] hover:text-[var(--color-text)]">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" stroke-width="2.5">
                            <path d="M3 6h18" />
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                        </svg>
                    </ZButton>
                </ZTooltip>
            </div>

            <!-- 右侧：目标文件名 -->
            <div class="w-[180px] min-w-0 flex items-center justify-end gap-2 flex-shrink-0">
                <ZBadge v-if="targetFileName"
                    class="text-xs font-medium truncate text-right text-[var(--color-secondary)]"
                    :title="targetFileName">{{ targetFileName }}</ZBadge>
                <ZBadge v-else class="text-xs text-[var(--color-secondary)] opacity-60">{{ t('wordTarget') }}</ZBadge>
            </div>
        </div>

        <!-- Main: Dropzones or Three-Column Layout -->
        <div class="flex-1 overflow-hidden relative bg-[var(--color-surface)]">
            <!-- Dropzones -->
            <div v-if="!bothLoaded" class="h-full flex gap-4 p-5">
                <FileDropzone side="source" :title="t('wordSource')" :hint="t('uploadWord')" :is-ready="!!sourceHtml"
                    :fileName="sourceFileName" accept=".docx,.doc" @change="handleFile($event, 'source')">
                    <template #icon>
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" stroke-width="2">
                            <path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4" />
                            <polyline points="14 2 14 8 20 8" />
                            <path d="M2 15h10" />
                            <path d="m9 18 3-3-3-3" />
                        </svg>
                    </template>
                </FileDropzone>
                <FileDropzone side="target" :title="t('wordTarget')" :hint="t('uploadWord')" :is-ready="!!targetHtml"
                    :fileName="targetFileName" accept=".docx,.doc" @change="handleFile($event, 'target')">
                    <template #icon>
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" stroke-width="2">
                            <path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4" />
                            <polyline points="14 2 14 8 20 8" />
                            <path d="M2 15h10" />
                            <path d="m9 18 3-3-3-3" />
                        </svg>
                    </template>
                </FileDropzone>
            </div>

            <!-- Error -->
            <div v-if="loadError"
                class="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg bg-red-500/20 text-red-500 text-sm border border-red-500/30">
                {{ loadError }}
            </div>

            <!-- Three-Column Layout: Left | Center Diff Bar | Right -->
            <div v-else class="h-full flex overflow-hidden bg-[var(--color-background)]">
                <!-- Left: Source -->
                <div ref="leftPanelRef"
                    class="flex-1 overflow-auto border-r border-[var(--color-border)] custom-scrollbar">
                    <div class="word-doc-panel p-6 min-h-full">
                        <div :id="'source-' + idx" v-for="(block, idx) in paragraphBlocks" :key="'src-' + idx" :class="[
                            'word-block min-h-[32px] py-1.5 px-2 rounded',
                            block.type === 'delete' && 'bg-[var(--color-delete-bg)]',
                            block.type === 'modified' && 'bg-[var(--color-delete-bg)]',
                            activeBlockIdx === idx && 'ring-2 ring-[var(--color-cta)]'
                        ]">
                            <div v-if="block.sourceHtml" class="word-html" v-html="block.sourceHtml">
                            </div>
                            <div v-else-if="block.sourceText" class="text-[var(--color-text)]">{{
                                block.sourceText ||
                                t('wordEmptyParagraph') }}</div>
                        </div>
                    </div>
                </div>

                <!-- Center: Slim Diff Bar -->
                <DiffBar ref="diffBarRef" :title="t('wordDiffShort') || t('diffResult')" :items="paragraphBlocks"
                    :active-index="activeBlockIdx" @item-click="scrollToBlock" />

                <!-- Right: Target -->
                <div ref="rightPanelRef" class="flex-1 overflow-auto custom-scrollbar">
                    <div class="word-doc-panel p-6 min-h-full">
                        <div :id="'target-' + idx" v-for="(block, idx) in paragraphBlocks" :key="'tgt-' + idx" :class="[
                            'word-block min-h-[32px] py-1.5 px-2 rounded',
                            block.type === 'insert' && 'bg-[var(--color-insert-bg)]',
                            block.type === 'modified' && 'bg-[var(--color-insert-bg)]',
                            activeBlockIdx === idx && 'ring-2 ring-[var(--color-cta)]'
                        ]">
                            <div v-if="block.targetHtml" class="word-html" v-html="block.targetHtml"></div>
                            <div v-else-if="block.targetText" class="text-[var(--color-text)]">{{ block.targetText ||
                                t('wordEmptyParagraph') }}</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Footer Legend -->
            <DiffLegend v-if="bothLoaded" :items="[
                { label: t('removed'), swatchClass: 'bg-[#fff5f5] border border-[#ffc9c9] dark:bg-[#3b1d1d] dark:border-[#555]' },
                { label: t('modified'), swatchClass: 'bg-[#fff9db] border border-[#ffec99] dark:bg-[#3e3810] dark:border-[#555]' },
                { label: t('added'), swatchClass: 'bg-[#ebfbee] border border-[#b2f2bb] dark:bg-[#1b3121] dark:border-[#555]' }
            ]" class="absolute bottom-0 left-0 right-0" />
        </div>
    </div>
</template>

<style scoped lang="scss">
.word-root {
    background: var(--color-background);
}

.word-doc-panel {
    font-size: 14px;
    line-height: 1.6;
}

.word-html {

    :deep(p),
    :deep(h1),
    :deep(h2),
    :deep(h3),
    :deep(h4),
    :deep(h5),
    :deep(h6),
    :deep(li),
    :deep(td) {
        margin: 0 0 0.5em 0;

        &:last-child {
            margin-bottom: 0;
        }
    }

    :deep(strong) {
        font-weight: 700;
    }

    :deep(em) {
        font-style: italic;
    }
}

.custom-scrollbar {
    &::-webkit-scrollbar {
        width: 6px;
        height: 6px;
    }

    &::-webkit-scrollbar-track {
        background: transparent;
    }

    &::-webkit-scrollbar-thumb {
        background: var(--color-border);
        border-radius: 10px;

        &:hover {
            background: var(--color-secondary);
        }
    }
}

.no-scrollbar::-webkit-scrollbar {
    display: none;
}
</style>
