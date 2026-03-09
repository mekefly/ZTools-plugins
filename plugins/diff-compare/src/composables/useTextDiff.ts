import { ref, shallowRef, computed, watch, onUnmounted } from 'vue'
import { Change } from 'diff'

interface DiffLine {
    type: 'equal' | 'delete' | 'insert'
    value: string
    leftLineNum?: number
    rightLineNum?: number
    inlineChanges?: Change[]
}

export function useTextDiff() {
    const sourceText = ref('')
    const targetText = ref('')
    const diffLines = ref<DiffLine[]>([])
    const isDiffing = ref(false)

    let diffWorker: Worker | null = null
    let currentRequestId = 0
    let debounceTimer: ReturnType<typeof setTimeout> | null = null

    const computeDiff = (source: string, target: string) => {
        if (debounceTimer) clearTimeout(debounceTimer)

        debounceTimer = setTimeout(() => {
            if (!diffWorker) {
                diffWorker = new Worker(new URL('@/core/diff/diff.worker.ts', import.meta.url), { type: 'module' })
                diffWorker.onmessage = (e) => {
                    const { requestId, result } = e.data
                    if (requestId === currentRequestId) {
                        const lines: DiffLine[] = []
                        let leftNum = 1
                        let rightNum = 1

                        for (const chunk of result) {
                            if (chunk.type === 'equal') {
                                lines.push({
                                    type: 'equal',
                                    value: chunk.source || '',
                                    leftLineNum: leftNum++,
                                    rightLineNum: rightNum++,
                                })
                            } else if (chunk.type === 'delete') {
                                lines.push({
                                    type: 'delete',
                                    value: chunk.source || '',
                                    leftLineNum: leftNum++,
                                })
                            } else if (chunk.type === 'insert') {
                                lines.push({
                                    type: 'insert',
                                    value: chunk.target || '',
                                    rightLineNum: rightNum++,
                                })
                            } else if (chunk.type === 'modify') {
                                const sourceLine = chunk.source || ''
                                const targetLine = chunk.target || ''
                                lines.push({
                                    type: 'delete',
                                    value: sourceLine,
                                    leftLineNum: leftNum++,
                                })
                                lines.push({
                                    type: 'insert',
                                    value: targetLine,
                                    rightLineNum: rightNum++,
                                })
                            }
                        }

                        diffLines.value = lines
                        isDiffing.value = false
                    }
                }
            }

            isDiffing.value = true
            const requestId = ++currentRequestId
            const sourceLines = source === '' ? [] : source.split('\n')
            const targetLines = target === '' ? [] : target.split('\n')
            diffWorker.postMessage({ type: 'text', source: sourceLines, target: targetLines, requestId })
        }, 300)
    }

    watch([sourceText, targetText], ([source, target]) => computeDiff(source, target), { immediate: true })

    onUnmounted(() => {
        if (diffWorker) {
            diffWorker.terminate()
            diffWorker = null
        }
    })

    const leftLines = computed(() => {
        return diffLines.value
            .filter(line => line.type === 'equal' || line.type === 'delete')
            .map((line, idx) => ({
                type: line.type,
                value: line.value,
                lineNum: line.leftLineNum,
                idx,
            }))
    })

    const rightLines = computed(() => {
        return diffLines.value
            .filter(line => line.type === 'equal' || line.type === 'insert')
            .map((line, idx) => ({
                type: line.type,
                value: line.value,
                lineNum: line.rightLineNum,
                idx,
            }))
    })

    const addedCount = computed(() => diffLines.value.filter(l => l.type === 'insert').length)
    const removedCount = computed(() => diffLines.value.filter(l => l.type === 'delete').length)

    const changeIndices = computed(() => {
        return diffLines.value
            .map((line, i) => (line.type !== 'equal' ? i : -1))
            .filter(i => i >= 0)
    })

    const totalChanges = computed(() => changeIndices.value.length)

    const unifiedDiffLines = computed(() => {
        return diffLines.value.map((line, idx) => ({
            type: line.type,
            value: line.value,
            leftNo: line.leftLineNum,
            rightNo: line.rightLineNum,
            inlineChanges: line.inlineChanges,
            idx,
        }))
    })

    const swapTexts = () => {
        const temp = sourceText.value
        sourceText.value = targetText.value
        targetText.value = temp
    }

    const LINE_HEIGHT = 24
    const currentChangeIdx = ref(-1)
    const scrollCallbacks = ref<((scrollTop: number) => void)[]>([])

    const registerScrollCallback = (callback: (scrollTop: number) => void) => {
        scrollCallbacks.value.push(callback)
        return () => {
            const idx = scrollCallbacks.value.indexOf(callback)
            if (idx > -1) scrollCallbacks.value.splice(idx, 1)
        }
    }

    const getScrollPosition = (diffLineIdx: number) => {
        return diffLineIdx * LINE_HEIGHT
    }

    const scrollToChange = (diffLineIdx: number) => {
        const scrollTop = getScrollPosition(diffLineIdx)
        scrollCallbacks.value.forEach(cb => cb(scrollTop))
    }

    const goToPrevChange = () => {
        if (totalChanges.value === 0) return
        const newIdx = currentChangeIdx.value <= 0 ? totalChanges.value - 1 : currentChangeIdx.value - 1
        currentChangeIdx.value = newIdx
        scrollToChange(changeIndices.value[newIdx])
    }

    const goToNextChange = () => {
        if (totalChanges.value === 0) return
        const newIdx = currentChangeIdx.value >= totalChanges.value - 1 ? 0 : currentChangeIdx.value + 1
        currentChangeIdx.value = newIdx
        scrollToChange(changeIndices.value[newIdx])
    }

    const resetNavigation = () => {
        currentChangeIdx.value = -1
    }

    return {
        sourceText,
        targetText,
        diffLines,
        isDiffing,
        leftLines,
        rightLines,
        addedCount,
        removedCount,
        changeIndices,
        totalChanges,
        unifiedDiffLines,
        swapTexts,
        currentChangeIdx,
        goToPrevChange,
        goToNextChange,
        resetNavigation,
        registerScrollCallback,
        getScrollPosition,
    }
}
