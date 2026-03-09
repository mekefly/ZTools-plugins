import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import mammoth from 'mammoth'
import { readFileAsArrayBuffer } from '@/utils/file'
import { getNextIndex, getPrevIndex } from '@/utils/diffNavigation'
import { DiffResult } from '@/core/diff/types'

interface ParagraphBlock {
    type: 'equal' | 'delete' | 'insert' | 'modify'
    sourceText: string
    targetText: string
}

function extractParagraphs(html: string): string[] {
    if (!html.trim()) return []
    const div = document.createElement('div')
    div.innerHTML = html
    const blocks = div.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li')
    const texts: string[] = []
    blocks.forEach(el => {
        const text = (el.textContent || '').trim()
        if (text) texts.push(text)
    })
    if (texts.length === 0 && html.trim()) {
        texts.push(div.textContent?.trim() || '')
    }
    return texts
}

export function useWordDiff() {
    const sourceHtml = ref('')
    const targetHtml = ref('')
    const sourceFileName = ref('')
    const targetFileName = ref('')
    const loading = ref(false)
    const loadError = ref('')

    const bothLoaded = computed(() => !!sourceHtml.value && !!targetHtml.value)
    const paragraphBlocks = ref<ParagraphBlock[]>([])
    const isDiffing = ref(false)
    const activeBlockIdx = ref(-1)

    let diffWorker: Worker | null = null
    let currentRequestId = 0

    const diffCount = computed(() => paragraphBlocks.value.filter(b => b.type !== 'equal').length)

    const computeDiff = async (srcHtml: string, tgtHtml: string) => {
        if (!srcHtml || !tgtHtml) {
            paragraphBlocks.value = []
            return
        }

        isDiffing.value = true
        const src = extractParagraphs(srcHtml)
        const tgt = extractParagraphs(tgtHtml)

        if (!diffWorker) {
            diffWorker = new Worker(new URL('@/core/diff/diff.worker.ts', import.meta.url), { type: 'module' })
        }

        const requestId = ++currentRequestId
        try {
            const workerResult: DiffResult<string>[] = await new Promise<DiffResult<string>[]>((resolve, reject) => {
                const handler = (e: MessageEvent) => {
                    const { requestId: resId, result, error } = e.data
                    if (resId === requestId) {
                        diffWorker!.removeEventListener('message', handler)
                        if (error) reject(error)
                        else resolve(result)
                    }
                }
                diffWorker!.addEventListener('message', handler)
                diffWorker!.postMessage({ type: 'word', source: src, target: tgt, requestId })
            })

            const blocks: ParagraphBlock[] = []
            for (const result of workerResult) {
                if (result.type === 'equal') {
                    blocks.push({
                        type: 'equal',
                        sourceText: result.source as string || '',
                        targetText: result.target as string || '',
                    })
                } else if (result.type === 'delete') {
                    blocks.push({
                        type: 'delete',
                        sourceText: result.source as string || '',
                        targetText: '',
                    })
                } else if (result.type === 'insert') {
                    blocks.push({
                        type: 'insert',
                        sourceText: '',
                        targetText: result.target as string || '',
                    })
                } else if (result.type === 'modify') {
                    blocks.push({
                        type: 'modify',
                        sourceText: result.source as string || '',
                        targetText: result.target as string || '',
                    })
                }
            }
            paragraphBlocks.value = blocks
        } catch (e) {
            console.error('Word diff calculation failed:', e)
        } finally {
            if (requestId === currentRequestId) {
                isDiffing.value = false
            }
        }
    }

    watch([sourceHtml, targetHtml], ([src, tgt]) => computeDiff(src, tgt), { immediate: true })

    const handleFile = async (e: Event, side: 'source' | 'target') => {
        const input = e.target as HTMLInputElement
        const files = input.files
        if (!files || files.length === 0) return

        loading.value = true
        loadError.value = ''
        try {
            if (files.length >= 2) {
                const [buf1, buf2] = await Promise.all([readFileAsArrayBuffer(files[0]), readFileAsArrayBuffer(files[1])])
                const [r1, r2] = await Promise.all([mammoth.convertToHtml({ arrayBuffer: buf1 }), mammoth.convertToHtml({ arrayBuffer: buf2 })])
                sourceHtml.value = r1.value
                targetHtml.value = r2.value
                sourceFileName.value = files[0].name
                targetFileName.value = files[1].name
            } else {
                const buf = await readFileAsArrayBuffer(files[0])
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
            loadError.value = (err as Error).message || 'Failed to load Word document'
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
        const extractFiles = (await import('@/utils/clipboard')).extractFilesFromClipboard
        const files = extractFiles(e, (file: File) => /\.docx?$/i.test(file.name))
        if (files.length === 0) return
        loading.value = true
        loadError.value = ''
        try {
            if (files.length >= 2) {
                const [buf1, buf2] = await Promise.all([readFileAsArrayBuffer(files[0]), readFileAsArrayBuffer(files[1])])
                const [r1, r2] = await Promise.all([mammoth.convertToHtml({ arrayBuffer: buf1 }), mammoth.convertToHtml({ arrayBuffer: buf2 })])
                sourceHtml.value = r1.value
                targetHtml.value = r2.value
                sourceFileName.value = files[0].name
                targetFileName.value = files[1].name
            } else {
                const buf = await readFileAsArrayBuffer(files[0])
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
            loadError.value = (err as Error).message || 'Failed to load Word document'
        } finally {
            loading.value = false
        }
    }

    const scrollToBlock = (idx: number, leftPanelRef: HTMLElement | null, rightPanelRef: HTMLElement | null, diffBarRef: HTMLElement | null) => {
        activeBlockIdx.value = idx
        if (!leftPanelRef || !rightPanelRef || !diffBarRef) return

        const sourceEl = leftPanelRef.querySelector(`#source-${idx}`)
        const targetEl = rightPanelRef.querySelector(`#target-${idx}`)
        const barEl = (diffBarRef as any)?.scrollContainer?.querySelector(`#diff-bar-item-${idx}`)

        requestAnimationFrame(() => {
            sourceEl?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            targetEl?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            barEl?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        })
    }

    const goToNextDiff = (): number | undefined => {
        const indices = paragraphBlocks.value.map((b, i) => b.type !== 'equal' ? i : -1).filter(i => i >= 0)
        const next = getNextIndex(indices, activeBlockIdx.value)
        if (next === -1) return
        return next
    }

    const goToPrevDiff = (): number | undefined => {
        const indices = paragraphBlocks.value.map((b, i) => b.type !== 'equal' ? i : -1).filter(i => i >= 0)
        const prev = getPrevIndex(indices, activeBlockIdx.value)
        if (prev === -1) return
        return prev
    }

    onMounted(() => window.addEventListener('paste', handlePaste))
    onUnmounted(() => {
        window.removeEventListener('paste', handlePaste)
        if (diffWorker) {
            diffWorker.terminate()
            diffWorker = null
        }
    })

    return {
        sourceHtml,
        targetHtml,
        sourceFileName,
        targetFileName,
        loading,
        loadError,
        bothLoaded,
        paragraphBlocks,
        isDiffing,
        activeBlockIdx,
        diffCount,
        handleFile,
        clearItems,
        handlePaste,
        scrollToBlock,
        goToNextDiff,
        goToPrevDiff,
    }
}