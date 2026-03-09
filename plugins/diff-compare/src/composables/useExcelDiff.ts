import { ref, shallowRef, computed, onMounted, onUnmounted } from 'vue'
import * as XLSX from 'xlsx'
import { readFileAsArrayBuffer } from '@/utils/file'
import { extractFilesFromClipboard } from '@/utils/clipboard'

interface CellDiff {
    row: number
    col: number
    address: string
    source: unknown
    target: unknown
}

interface SheetDiff {
    name: string
    diffs: CellDiff[]
    sourceData: string[][]
    targetData: string[][]
    rowCount: number
    colCount: number
}

export function useExcelDiff() {
    const sourceWorkbook = shallowRef<XLSX.WorkBook | null>(null)
    const targetWorkbook = shallowRef<XLSX.WorkBook | null>(null)
    const selectedSheetName = ref('')
    const diffResult = ref<SheetDiff[]>([])
    const loading = ref(false)
    const activeCell = ref<{ row: number; col: number } | null>(null)
    const showDiffPanel = ref(false)

    let diffWorker: Worker | null = null
    let currentRequestId = 0

    const bothLoaded = computed(() => !!sourceWorkbook.value && !!targetWorkbook.value)

    const sheetOptions = computed(() => {
        return diffResult.value.map(s => ({ label: s.name, value: s.name }))
    })

    const currentSheetDiff = computed(() => {
        return diffResult.value.find(s => s.name === selectedSheetName.value) || null
    })

    const readWorkbook = async (file: File): Promise<XLSX.WorkBook> => {
        const buffer = await readFileAsArrayBuffer(file)
        const data = new Uint8Array(buffer)
        return XLSX.read(data, { type: 'array' })
    }

    const handleFile = async (e: Event, side: 'source' | 'target') => {
        const input = e.target as HTMLInputElement
        const files = input.files
        if (!files || files.length === 0) return

        loading.value = true
        try {
            if (files.length >= 2) {
                sourceWorkbook.value = await readWorkbook(files[0])
                targetWorkbook.value = await readWorkbook(files[1])
            } else {
                const wb = await readWorkbook(files[0])
                if (side === 'source') sourceWorkbook.value = wb
                else targetWorkbook.value = wb
            }
            await compareWorkbooks()
        } finally {
            loading.value = false
            input.value = ''
        }
    }

    const compareWorkbooks = async () => {
        if (!sourceWorkbook.value || !targetWorkbook.value) return

        loading.value = true
        const results: SheetDiff[] = []
        const sourceSheets = sourceWorkbook.value.SheetNames
        const targetSheets = targetWorkbook.value.SheetNames

        const allSheetNames = Array.from(new Set([...sourceSheets, ...targetSheets]))

        if (!diffWorker) {
            diffWorker = new Worker(new URL('@/core/diff/diff.worker.ts', import.meta.url), { type: 'module' })
        }

        for (const name of allSheetNames) {
            const sourceSheet = sourceWorkbook.value!.Sheets[name]
            const targetSheet = targetWorkbook.value!.Sheets[name]

            if (!sourceSheet && !targetSheet) continue

            const sourceJSON = sourceSheet ? XLSX.utils.sheet_to_json(sourceSheet, { header: 1, raw: false, defval: '' }) as string[][] : []
            const targetJSON = targetSheet ? XLSX.utils.sheet_to_json(targetSheet, { header: 1, raw: false, defval: '' }) as string[][] : []

            const requestId = ++currentRequestId

            const workerResult = await new Promise<unknown>((resolve, reject) => {
                const handler = (e: MessageEvent) => {
                    const { requestId: resId, result, error } = e.data
                    if (resId === requestId) {
                        diffWorker!.removeEventListener('message', handler)
                        if (error) reject(error)
                        else resolve(result)
                    }
                }
                diffWorker!.addEventListener('message', handler)
                diffWorker!.postMessage({
                    type: 'excel',
                    source: sourceJSON,
                    target: targetJSON,
                    requestId
                })
            }) as { diffs: CellDiff[], maxRows: number, maxCols: number }

            results.push({
                name,
                diffs: workerResult.diffs.map(d => ({
                    ...d,
                    address: XLSX.utils.encode_cell({ r: d.row, c: d.col })
                })),
                sourceData: sourceJSON,
                targetData: targetJSON,
                rowCount: workerResult.maxRows,
                colCount: workerResult.maxCols
            })
        }

        diffResult.value = results
        if (results.length > 0 && !selectedSheetName.value) {
            selectedSheetName.value = results[0].name
        }
        loading.value = false
    }

    onUnmounted(() => {
        if (diffWorker) {
            diffWorker.terminate()
            diffWorker = null
        }
    })

    const clearItems = () => {
        sourceWorkbook.value = null
        targetWorkbook.value = null
        diffResult.value = []
        selectedSheetName.value = ''
    }

    const handlePaste = async (e: ClipboardEvent) => {
        const files = extractFilesFromClipboard(e, (file) =>
            file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')
        )

        if (files.length === 0) return
        loading.value = true
        try {
            if (files.length >= 2) {
                sourceWorkbook.value = await readWorkbook(files[0])
                targetWorkbook.value = await readWorkbook(files[1])
            } else {
                const wb = await readWorkbook(files[0])
                if (sourceWorkbook.value) targetWorkbook.value = wb
                else sourceWorkbook.value = wb
            }
            await compareWorkbooks()
        } finally {
            loading.value = false
        }
    }

    const getCellClass = (row: number, col: number, side: 'source' | 'target' | 'unified' = 'unified') => {
        if (!currentSheetDiff.value) return ''

        let baseClass = ''
        const diff = currentSheetDiff.value.diffs.find(d => d.row === row && d.col === col)
        if (diff) {
            const sValue = currentSheetDiff.value.sourceData[row]?.[col]
            const tValue = currentSheetDiff.value.targetData[row]?.[col]

            if (sValue === undefined || sValue === null || sValue === '') {
                if (side !== 'source') baseClass = 'cell-added'
            }
            else if (tValue === undefined || tValue === null || tValue === '') {
                if (side !== 'target') baseClass = 'cell-removed'
            }
            else {
                baseClass = 'cell-modified'
            }
        }

        if (activeCell.value?.row === row && activeCell.value?.col === col) {
            baseClass += ' cell--active'
        }

        return baseClass
    }

    const getColumnName = (col: number) => XLSX.utils.encode_col(col)

    const getSheetDiffCount = (name: string) => {
        const sheet = diffResult.value.find(s => s.name === name)
        return sheet?.diffs.length || 0
    }

    const getRowDiff = (row: number) => {
        if (!currentSheetDiff.value) return null
        const rowDiffs = currentSheetDiff.value.diffs.filter(d => d.row === row)
        if (rowDiffs.length === 0) return null

        const modified = rowDiffs.find(d => getCellClass(d.row, d.col).includes('cell-modified'))
        if (modified) return { type: 'modified', ...modified }

        const added = rowDiffs.find(d => getCellClass(d.row, d.col).includes('cell-added'))
        if (added) return { type: 'added', ...added }

        const removed = rowDiffs.find(d => getCellClass(d.row, d.col).includes('cell-removed'))
        if (removed) return { type: 'removed', ...removed }

        return { type: 'modified', ...rowDiffs[0] }
    }

    onMounted(() => {
        window.addEventListener('paste', handlePaste)
    })

    onUnmounted(() => {
        window.removeEventListener('paste', handlePaste)
    })

    return {
        sourceWorkbook,
        targetWorkbook,
        selectedSheetName,
        diffResult,
        loading,
        activeCell,
        showDiffPanel,
        bothLoaded,
        sheetOptions,
        currentSheetDiff,
        handleFile,
        clearItems,
        getCellClass,
        getColumnName,
        getSheetDiffCount,
        getRowDiff,
    }
}