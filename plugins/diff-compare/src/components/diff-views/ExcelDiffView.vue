<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import * as XLSX from 'xlsx'
import ZBadge from '@/components/ui/base/ZBadge.vue'
import ZButton from '@/components/ui/base/ZButton.vue'
import ZTooltip from '@/components/ui/base/ZTooltip.vue'
import ZSelect from '@/components/ui/base/ZSelect.vue'
import FileDropzone from '@/components/shared/FileDropzone.vue'
import DiffLegend from '@/components/shared/DiffLegend.vue'
import { normalizeString } from '@/utils/string'

const { t } = useI18n()

type ViewMode = 'split' | 'unified'
const viewMode = ref<ViewMode>('split')

interface CellDiff {
    row: number
    col: number
    address: string
    source: any
    target: any
}

interface SheetDiff {
    name: string
    diffs: CellDiff[]
    sourceData: any[][]
    targetData: any[][]
    rowCount: number
    colCount: number
}

const sourceWorkbook = ref<XLSX.WorkBook | null>(null)
const targetWorkbook = ref<XLSX.WorkBook | null>(null)
const selectedSheetName = ref('')
const diffResult = ref<SheetDiff[]>([])
const loading = ref(false)

const bothLoaded = computed(() => !!sourceWorkbook.value && !!targetWorkbook.value)

const sheetOptions = computed(() => {
    return diffResult.value.map(s => ({ label: s.name, value: s.name }))
})

const currentSheetDiff = computed(() => {
    return diffResult.value.find(s => s.name === selectedSheetName.value) || null
})

const readFile = (file: File): Promise<XLSX.WorkBook> =>
    new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = (e) => {
            const data = new Uint8Array(e.target?.result as ArrayBuffer)
            const workbook = XLSX.read(data, { type: 'array' })
            resolve(workbook)
        }
        reader.readAsArrayBuffer(file)
    })

const handleFile = async (e: Event, side: 'source' | 'target') => {
    const input = e.target as HTMLInputElement
    const files = input.files
    if (!files || files.length === 0) return

    loading.value = true
    try {
        if (files.length >= 2) {
            sourceWorkbook.value = await readFile(files[0])
            targetWorkbook.value = await readFile(files[1])
        } else {
            const wb = await readFile(files[0])
            if (side === 'source') sourceWorkbook.value = wb
            else targetWorkbook.value = wb
        }
        compareWorkbooks()
    } finally {
        loading.value = false
        input.value = ''
    }
}

const compareWorkbooks = () => {
    if (!sourceWorkbook.value || !targetWorkbook.value) return

    const results: SheetDiff[] = []
    const sourceSheets = sourceWorkbook.value.SheetNames
    const targetSheets = targetWorkbook.value.SheetNames

    // Compare all sheets from both
    const allSheetNames = Array.from(new Set([...sourceSheets, ...targetSheets]))

    allSheetNames.forEach(name => {
        const sourceSheet = sourceWorkbook.value!.Sheets[name]
        const targetSheet = targetWorkbook.value!.Sheets[name]

        if (!sourceSheet && !targetSheet) return

        const sourceJSON = sourceSheet ? XLSX.utils.sheet_to_json(sourceSheet, { header: 1, raw: false, defval: '' }) as string[][] : []
        const targetJSON = targetSheet ? XLSX.utils.sheet_to_json(targetSheet, { header: 1, raw: false, defval: '' }) as string[][] : []

        const diffs: CellDiff[] = []
        const maxRows = Math.max(sourceJSON.length, targetJSON.length)
        let maxCols = 0

        for (let r = 0; r < maxRows; r++) {
            const sourceRow = sourceJSON[r] || []
            const targetRow = targetJSON[r] || []
            const rowMaxCols = Math.max(sourceRow.length, targetRow.length)
            if (rowMaxCols > maxCols) maxCols = rowMaxCols

            for (let c = 0; c < rowMaxCols; c++) {
                const sVal = normalizeString(sourceRow[c])
                const tVal = normalizeString(targetRow[c])

                if (sVal !== tVal) {
                    diffs.push({
                        row: r,
                        col: c,
                        address: XLSX.utils.encode_cell({ r, c }),
                        source: sVal,
                        target: tVal
                    })
                }
            }
        }

        results.push({
            name,
            diffs,
            sourceData: sourceJSON,
            targetData: targetJSON,
            rowCount: maxRows,
            colCount: maxCols
        })
    })

    diffResult.value = results
    if (results.length > 0 && !selectedSheetName.value) {
        selectedSheetName.value = results[0].name
    }
}

const clearItems = () => {
    sourceWorkbook.value = null
    targetWorkbook.value = null
    diffResult.value = []
    selectedSheetName.value = ''
}

const handlePaste = async (e: ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return

    const files: File[] = []
    for (let i = 0; i < items.length; i++) {
        if (items[i].kind === 'file') {
            const file = items[i].getAsFile()
            if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv'))) {
                files.push(file)
            }
        }
    }

    if (files.length === 0) return
    loading.value = true
    try {
        if (files.length >= 2) {
            sourceWorkbook.value = await readFile(files[0])
            targetWorkbook.value = await readFile(files[1])
        } else {
            const wb = await readFile(files[0])
            // If source is already there, put in target, else source
            if (sourceWorkbook.value) targetWorkbook.value = wb
            else sourceWorkbook.value = wb
        }
        compareWorkbooks()
    } finally {
        loading.value = false
    }
}

const sourceTableRef = ref<HTMLElement | null>(null)
const targetTableRef = ref<HTMLElement | null>(null)
const unifiedTableRef = ref<HTMLElement | null>(null)
const diffBarRef = ref<HTMLElement | null>(null)
const activeCell = ref<{ row: number; col: number } | null>(null)
const showDiffPanel = ref(false)

let isProgrammaticScroll = false
let scrollTimeout: ReturnType<typeof setTimeout> | null = null

const scrollToCell = (row: number, col: number) => {
    activeCell.value = { row, col }
    const source = sourceTableRef.value
    const target = targetTableRef.value
    const unified = unifiedTableRef.value
    const diffBar = diffBarRef.value

    isProgrammaticScroll = true
    if (scrollTimeout) clearTimeout(scrollTimeout)
    scrollTimeout = setTimeout(() => {
        isProgrammaticScroll = false
    }, 1000)

    const scrollContainerToElement = (containerId: 'source' | 'target' | 'unified', elId: string) => {
        const container = containerId === 'unified' ? unified : (containerId === 'source' ? source : target)
        if (!container) return
        const el = document.getElementById(elId)
        if (!el) return

        let targetTop = el.offsetTop
        let targetLeft = el.offsetLeft

        // Center the matched cell in the viewport
        targetTop -= container.clientHeight / 2 - el.clientHeight / 2
        targetLeft -= container.clientWidth / 2 - el.clientWidth / 2

        const safeTop = Math.max(0, targetTop)
        const safeLeft = Math.max(0, targetLeft)

        container.scrollTo({ top: safeTop, left: safeLeft, behavior: 'smooth' })

        // If in split mode and we just calculated the source or target, sync the others
        if (viewMode.value === 'split' && containerId === 'source') {
            if (target) target.scrollTo({ top: safeTop, left: safeLeft, behavior: 'smooth' })
            if (diffBar) diffBar.scrollTo({ top: safeTop, behavior: 'smooth' })
        }
    }

    if (viewMode.value === 'split') {
        scrollContainerToElement('source', `cell-source-${row}-${col}`)
    } else {
        scrollContainerToElement('unified', `cell-unified-${row}-${col}`)
    }
}

const goToNextDiff = () => {
    if (!currentSheetDiff.value || !currentSheetDiff.value.diffs.length) return
    // 获取所有差异块的索引
    const diffs = currentSheetDiff.value.diffs
    const currentIndex = activeCell.value ? diffs.findIndex(d => d.row === activeCell.value?.row && d.col === activeCell.value?.col) : -1
    // 获取下一个差异块的索引
    const nextIndex = (currentIndex + 1) % diffs.length
    // 获取下一个差异块
    const nextDiff = diffs[nextIndex]
    scrollToCell(nextDiff.row, nextDiff.col)
}

let activeScrollTarget: HTMLElement | null = null
let syncScrollTimeout: ReturnType<typeof setTimeout> | null = null

const syncScroll = (e: Event) => {
    if (isProgrammaticScroll || viewMode.value !== 'split') return
    const source = sourceTableRef.value
    const target = targetTableRef.value
    const diffBar = diffBarRef.value
    if (!source || !target || !diffBar) return

    const scrollTarget = e.target as HTMLElement

    // Prevent scroll feedback loops
    if (activeScrollTarget && activeScrollTarget !== scrollTarget) return
    activeScrollTarget = scrollTarget

    if (syncScrollTimeout) clearTimeout(syncScrollTimeout)
    syncScrollTimeout = setTimeout(() => {
        activeScrollTarget = null
    }, 50)

    if (scrollTarget === source) {
        if (target.scrollTop !== source.scrollTop) target.scrollTop = source.scrollTop
        if (diffBar.scrollTop !== source.scrollTop) diffBar.scrollTop = source.scrollTop
        if (target.scrollLeft !== source.scrollLeft) target.scrollLeft = source.scrollLeft
    } else if (scrollTarget === target) {
        if (source.scrollTop !== target.scrollTop) source.scrollTop = target.scrollTop
        if (diffBar.scrollTop !== target.scrollTop) diffBar.scrollTop = target.scrollTop
        if (source.scrollLeft !== target.scrollLeft) source.scrollLeft = target.scrollLeft
    } else if (scrollTarget === diffBar) {
        if (source.scrollTop !== diffBar.scrollTop) source.scrollTop = diffBar.scrollTop
        if (target.scrollTop !== diffBar.scrollTop) target.scrollTop = diffBar.scrollTop
    }
}

onMounted(() => {
    window.addEventListener('paste', handlePaste)
})

onUnmounted(() => {
    window.removeEventListener('paste', handlePaste)
})

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

const getColumnName = (col: number) => {
    return XLSX.utils.encode_col(col)
}

const getSheetDiffCount = (name: string) => {
    const sheet = diffResult.value.find(s => s.name === name)
    return sheet?.diffs.length || 0
}

const getRowDiff = (row: number) => {
    if (!currentSheetDiff.value) return null
    const rowDiffs = currentSheetDiff.value.diffs.filter(d => d.row === row)
    if (rowDiffs.length === 0) return null

    // Find the "most important" diff type for this row
    // Priority: Modified > Added/Removed
    const modified = rowDiffs.find(d => getCellClass(d.row, d.col).includes('cell-modified'))
    if (modified) return { type: 'modified', ...modified }

    const added = rowDiffs.find(d => getCellClass(d.row, d.col).includes('cell-added'))
    if (added) return { type: 'added', ...added }

    const removed = rowDiffs.find(d => getCellClass(d.row, d.col).includes('cell-removed'))
    if (removed) return { type: 'removed', ...removed }

    return { type: 'modified', ...rowDiffs[0] }
}

</script>

<template>
    <div class="excel-root flex flex-col h-full overflow-hidden">
        <!-- ── Top Toolbar ─────────────────────────────────────── -->
        <div
            class="h-14 border-b border-[var(--color-border)] bg-[var(--color-background)] flex items-center justify-between px-5 flex-shrink-0 z-30 shadow-sm relative w-full">
            <div class="flex items-center gap-3">
                <div class="flex items-center gap-2 transition-opacity"
                    :class="{ 'opacity-50 pointer-events-none': !bothLoaded }">
                    <ZBadge variant="surface" size="lg">{{ t('sheet') }}</ZBadge>
                    <ZSelect v-model="selectedSheetName" :options="sheetOptions" class="min-w-[140px]"
                        :disabled="!bothLoaded" />
                </div>

                <div class="h-4 w-px bg-[var(--color-border)] mx-1"></div>

                <div class="flex items-center gap-2">
                    <div class="flex bg-[var(--color-surface)] rounded-md border border-[var(--color-border)] p-1 shadow-sm transition-opacity"
                        :class="{ 'opacity-50 pointer-events-none': !bothLoaded }">
                        <ZButton :variant="viewMode === 'split' ? 'primary' : 'surface'" size="sm"
                            @click="viewMode = 'split'" class="!rounded-md">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                                fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"
                                stroke-linejoin="round">
                                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                                <line x1="12" y1="3" x2="12" y2="21" />
                            </svg>
                            {{ t('viewSplit') }}
                        </ZButton>
                        <ZButton :variant="viewMode === 'unified' ? 'primary' : 'surface'" size="sm"
                            @click="viewMode = 'unified'" class="!rounded-md">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                                fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"
                                stroke-linejoin="round">
                                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                            </svg>
                            {{ t('viewUnified') }}
                        </ZButton>
                    </div>
                </div>

                <div class="h-4 w-px bg-[var(--color-border)] mx-1"
                    v-if="currentSheetDiff && currentSheetDiff.diffs.length"></div>

                <div class="flex items-center gap-1" v-if="currentSheetDiff && currentSheetDiff.diffs.length">
                    <ZBadge variant="primary" size="lg"
                        class="cursor-pointer hover:brightness-110 active:scale-95 transition-all select-none"
                        @click="goToNextDiff(); showDiffPanel = true">
                        {{ currentSheetDiff.diffs.length }} {{ t('cellDiff') }}
                    </ZBadge>
                </div>
            </div>

            <div class="flex items-center gap-2">
                <ZTooltip :content="t('clearItems')">
                    <ZButton variant="danger" size="sm" @click="clearItems"
                        :disabled="!sourceWorkbook && !targetWorkbook">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M3 6h18" />
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                        </svg>
                        {{ t('clearItems') }}
                    </ZButton>
                </ZTooltip>
            </div>
        </div>

        <!-- ── Main Workspace ──────────────────────────────────── -->
        <div class="flex-1 overflow-hidden relative bg-[var(--color-surface)]">

            <!-- DROPZONES -->
            <div v-if="!bothLoaded" class="h-full flex gap-4 p-5">
                <FileDropzone side="source" :title="t('excelSource')" :hint="t('uploadExcel')"
                    :is-ready="!!sourceWorkbook" accept=".xlsx,.xls,.csv" @change="handleFile($event, 'source')">
                    <template #icon>
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" stroke-width="2">
                            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                            <polyline points="14 2 14 8 20 8" />
                            <path d="M8 13h2" />
                            <path d="M8 17h2" />
                            <path d="M14 13h2" />
                            <path d="M14 17h2" />
                        </svg>
                    </template>
                </FileDropzone>
                <FileDropzone side="target" :title="t('excelTarget')" :hint="t('uploadExcel')"
                    :is-ready="!!targetWorkbook" accept=".xlsx,.xls,.csv" @change="handleFile($event, 'target')">
                    <template #icon>
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" stroke-width="2">
                            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                            <polyline points="14 2 14 8 20 8" />
                            <path d="M8 13h2" />
                            <path d="M8 17h2" />
                            <path d="M14 13h2" />
                            <path d="M14 17h2" />
                        </svg>
                    </template>
                </FileDropzone>
            </div>

            <!-- NATIVE GRID VIEW -->
            <div v-else-if="currentSheetDiff" class="h-full flex flex-col overflow-hidden">
                <div class="flex-1 flex overflow-hidden bg-[var(--color-background)]">

                    <!-- UNIFIED VIEW -->
                    <div v-if="viewMode === 'unified'" ref="unifiedTableRef"
                        class="flex-1 overflow-auto native-grid custom-scrollbar">
                        <table class="excel-table">
                            <thead>
                                <tr>
                                    <th class="corner-header"></th>
                                    <th v-for="c in currentSheetDiff.colCount" :key="'h-' + c" class="col-header"
                                        :class="{ 'col-header--active': activeCell?.col === (c - 1) }">
                                        <div class="flex items-center justify-center gap-1.5 px-2 h-full">
                                            <span>{{ getColumnName(c - 1) }}</span>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"
                                                viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4"
                                                stroke-linecap="round" stroke-linejoin="round" class="opacity-20">
                                                <path d="m6 9 6 6 6-6" />
                                            </svg>
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="r in currentSheetDiff.rowCount" :key="'r-' + r">
                                    <td class="row-header"
                                        :class="{ 'row-header--active': activeCell?.row === (r - 1) }">
                                        {{ r }}
                                    </td>
                                    <td v-for="c in currentSheetDiff.colCount" :key="'c-' + r + '-' + c"
                                        :id="`cell-unified-${r - 1}-${c - 1}`" class="cell-wrapper"
                                        :class="getCellClass(r - 1, c - 1)">
                                        <div class="cell-content">
                                            <template v-if="getCellClass(r - 1, c - 1).includes('cell-modified')">
                                                <div class="val-old">{{ currentSheetDiff.sourceData[r - 1]?.[c - 1] }}
                                                </div>
                                                <div class="val-new">{{ currentSheetDiff.targetData[r - 1]?.[c - 1] }}
                                                </div>
                                            </template>
                                            <template v-else-if="getCellClass(r - 1, c - 1).includes('cell-added')">
                                                <div class="val-new">{{ currentSheetDiff.targetData[r - 1]?.[c - 1] }}
                                                </div>
                                            </template>
                                            <template v-else-if="getCellClass(r - 1, c - 1).includes('cell-removed')">
                                                <div class="val-old">{{ currentSheetDiff.sourceData[r - 1]?.[c - 1] }}
                                                </div>
                                            </template>
                                            <template v-else>
                                                <span class="val-plain">{{ currentSheetDiff.targetData[r - 1]?.[c - 1]
                                                    || currentSheetDiff.sourceData[r - 1]?.[c - 1] }}</span>
                                            </template>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <!-- SPLIT VIEW -->
                    <template v-else>
                        <div ref="sourceTableRef"
                            class="flex-1 overflow-auto border-r border-[var(--color-border)] native-grid custom-scrollbar"
                            @scroll="syncScroll">
                            <table class="excel-table">
                                <thead>
                                    <tr>
                                        <th class="corner-header"></th>
                                        <th v-for="c in currentSheetDiff.colCount" :key="'shl-' + c" class="col-header"
                                            :class="{ 'col-header--active': activeCell?.col === (c - 1) }">
                                            <div class="flex items-center justify-center gap-1.5 px-2 h-full">
                                                <span>{{ getColumnName(c - 1) }}</span>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"
                                                    viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                                    stroke-width="4" stroke-linecap="round" stroke-linejoin="round"
                                                    class="opacity-20">
                                                    <path d="m6 9 6 6 6-6" />
                                                </svg>
                                            </div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="r in currentSheetDiff.rowCount" :key="'srl-' + r">
                                        <td class="row-header"
                                            :class="{ 'row-header--active': activeCell?.row === (r - 1) }">
                                            {{ r }}
                                        </td>
                                        <td v-for="c in currentSheetDiff.colCount" :key="'sc-' + r + '-' + c"
                                            :id="`cell-source-${r - 1}-${c - 1}`" class="cell-wrapper"
                                            :class="getCellClass(r - 1, c - 1, 'source')">
                                            <div class="cell-content">
                                                <span class="val-plain">{{ currentSheetDiff.sourceData[r - 1]?.[c - 1]
                                                }}</span>
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <!-- ── CENTRAL DIFF BAR ─────────────────── -->
                        <div ref="diffBarRef"
                            class="w-16 bg-[var(--color-surface)] border-x border-[var(--color-border)] overflow-hidden flex flex-col no-scrollbar shadow-[0_0_15px_-3px_rgba(0,0,0,0.05)] z-10"
                            @scroll="syncScroll">
                            <div
                                class="h-8 border-b border-[var(--color-border)] flex items-center justify-center bg-[var(--color-background)] flex-shrink-0 text-[10px] font-bold text-[var(--color-secondary)] uppercase tracking-tighter sticky top-0 z-40 shadow-sm">
                                {{ t('diffResult') || 'Diff' }}
                            </div>
                            <div class="flex-1 py-1">
                                <div v-for="r in currentSheetDiff.rowCount" :key="'db-' + r" :id="`diff-row-${r - 1}`"
                                    class="h-6 flex items-center justify-center relative">

                                    <!-- Connection Lines (Optional styling purely for visual flow) -->
                                    <div v-if="getRowDiff(r - 1)"
                                        class="absolute left-0 right-0 h-px bg-current opacity-10"
                                        :class="`text-${getRowDiff(r - 1)?.type === 'modified' ? 'yellow-500' : (getRowDiff(r - 1)?.type === 'added' ? 'emerald-500' : 'red-500')}`">
                                    </div>

                                    <ZTooltip v-if="getRowDiff(r - 1)" position="top">
                                        <div class="diff-icon-wrapper relative z-10" :class="[
                                            'diff-icon--' + getRowDiff(r - 1)?.type,
                                            activeCell?.row === (r - 1) ? 'diff-icon--active' : ''
                                        ]" @click="scrollToCell(r - 1, getRowDiff(r - 1)?.col || 0)">
                                            <template v-if="getRowDiff(r - 1)?.type === 'modified'">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14"
                                                    viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                                    stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                                    <path d="M12 20h9" />
                                                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                                                </svg>
                                            </template>
                                            <template v-else-if="getRowDiff(r - 1)?.type === 'added'">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14"
                                                    viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                                    stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                                                    <line x1="12" y1="5" x2="12" y2="19" />
                                                    <line x1="5" y1="12" x2="19" y2="12" />
                                                </svg>
                                            </template>
                                            <template v-else-if="getRowDiff(r - 1)?.type === 'removed'">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14"
                                                    viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                                    stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                                                    <line x1="5" y1="12" x2="19" y2="12" />
                                                </svg>
                                            </template>
                                        </div>
                                        <template #content>
                                            <div class="p-1 px-2 text-xs">
                                                <div class="font-bold mb-1 opacity-70">
                                                    {{ getRowDiff(r - 1)?.type === 'modified' ? t('modified') :
                                                        (getRowDiff(r - 1)?.type === 'added' ? t('added') : t('removed')) }}
                                                </div>
                                                <div class="flex items-center gap-2 whitespace-nowrap">
                                                    <span v-if="getRowDiff(r - 1)?.source"
                                                        class="text-red-400 line-through">{{ getRowDiff(r - 1)?.source
                                                        }}</span>
                                                    <svg v-if="getRowDiff(r - 1)?.type === 'modified'"
                                                        xmlns="http://www.w3.org/2000/svg" width="10" height="10"
                                                        viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                                        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                        <path d="M5 12h14" />
                                                        <path d="m12 5 7 7-7 7" />
                                                    </svg>
                                                    <span v-if="getRowDiff(r - 1)?.target"
                                                        class="text-green-400 font-bold">{{ getRowDiff(r - 1)?.target
                                                        }}</span>
                                                </div>
                                                <div class="mt-1 text-[10px] opacity-50">{{ getRowDiff(r - 1)?.address
                                                    }}
                                                </div>
                                            </div>
                                        </template>
                                    </ZTooltip>
                                </div>
                            </div>
                        </div>

                        <div ref="targetTableRef" class="flex-1 overflow-auto native-grid custom-scrollbar"
                            @scroll="syncScroll">
                            <table class="excel-table">
                                <thead>
                                    <tr>
                                        <th class="corner-header"></th>
                                        <th v-for="c in currentSheetDiff.colCount" :key="'shr-' + c" class="col-header">
                                            {{ getColumnName(c - 1) }}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="r in currentSheetDiff.rowCount" :key="'srr-' + r">
                                        <td class="row-header">{{ r }}</td>
                                        <td v-for="c in currentSheetDiff.colCount" :key="'tc-' + r + '-' + c"
                                            :id="`cell-target-${r - 1}-${c - 1}`" class="cell-wrapper"
                                            :class="getCellClass(r - 1, c - 1, 'target')">
                                            <div class="cell-content">
                                                <span class="val-plain">{{ currentSheetDiff.targetData[r - 1]?.[c - 1]
                                                }}</span>
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </template>
                </div>

                <!-- ── DIFFERENCE PANEL SIDEBAR ─────────────────── -->
                <transition name="slide-right">
                    <div v-if="showDiffPanel"
                        class="absolute right-0 top-0 bottom-0 w-80 bg-[var(--color-surface)] border-l border-[var(--color-border)] z-40 shadow-2xl flex flex-col">
                        <div
                            class="h-12 flex items-center justify-between px-4 border-b border-[var(--color-border)] bg-[var(--color-background)]">
                            <h3 class="font-bold text-sm">{{ t('cellDiff') }}</h3>
                            <ZButton variant="ghost" size="icon-sm" @click="showDiffPanel = false">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                                    fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"
                                    stroke-linejoin="round">
                                    <path d="M18 6 6 18" />
                                    <path d="m6 6 12 12" />
                                </svg>
                            </ZButton>
                        </div>
                        <div class="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                            <div v-for="(diff, idx) in currentSheetDiff?.diffs" :key="idx"
                                class="p-3 rounded-lg border border-transparent hover:border-[var(--color-border)] hover:bg-[var(--color-background)] cursor-pointer group transition-all"
                                :class="{ 'diff-item--active': activeCell?.row === diff.row && activeCell?.col === diff.col }"
                                @click="scrollToCell(diff.row, diff.col)">
                                <div class="flex items-center justify-between mb-2">
                                    <span
                                        class="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[var(--color-surface)] text-[var(--color-secondary)] border border-[var(--color-border)]">{{
                                            diff.address }}</span>
                                    <ZBadge
                                        :variant="getCellClass(diff.row, diff.col).includes('cell-added') ? 'success' : (getCellClass(diff.row, diff.col).includes('cell-removed') ? 'danger' : 'primary')"
                                        size="sm">
                                        {{ getCellClass(diff.row, diff.col).replace('cell-', '')
                                            .replace('cell--active',
                                                '').toUpperCase() }}
                                    </ZBadge>
                                </div>
                                <div class="grid grid-cols-[1fr,auto,1fr] items-center gap-2">
                                    <div class="text-xs truncate opacity-60 line-through" v-if="diff.source">{{
                                        diff.source }}</div>
                                    <div class="text-xs truncate italic opacity-40 mx-auto" v-else>Empty</div>

                                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24"
                                        fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"
                                        stroke-linejoin="round" class="opacity-30">
                                        <path d="M5 12h14" />
                                        <path d="m12 5 7 7-7 7" />
                                    </svg>

                                    <div class="text-xs truncate font-bold" v-if="diff.target">{{ diff.target }}</div>
                                    <div class="text-xs truncate italic opacity-40" v-else>Empty</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </transition>
                <!-- ── BOTTOM SHEET TABS ────────────────────────────── -->
                <div
                    class="h-9 bg-[#f3f3f3] dark:bg-[#2a2a2a] border-t border-[var(--color-border)] flex items-center px-1 overflow-hidden flex-shrink-0">
                    <div class="flex h-full items-end gap-px overflow-x-auto no-scrollbar">
                        <button v-for="sheet in diffResult" :key="sheet.name" class="sheet-tab"
                            :class="{ 'sheet-tab--active': selectedSheetName === sheet.name }"
                            @click="selectedSheetName = sheet.name">
                            <span class="sheet-tab-name">{{ sheet.name }}</span>
                            <span v-if="getSheetDiffCount(sheet.name)" class="sheet-diff-dot"></span>
                        </button>
                    </div>
                </div>

                <!-- Footer Legend -->
                <DiffLegend :items="[
                    { label: t('cellOriginal'), swatchClass: 'bg-[#fff5f5] border border-[#ffc9c9] dark:bg-[#3b1d1d] dark:border-[#555]' },
                    { label: t('cellModified'), swatchClass: 'bg-[#ebfbee] border border-[#b2f2bb] dark:bg-[#1b3121] dark:border-[#555]' },
                    { label: 'Changed', swatchClass: 'bg-[#fff9db] border border-[#ffec99] dark:bg-[#3e3810] dark:border-[#555]' }
                ]" />
            </div>
        </div>
    </div>
</template>

<style scoped lang="scss">
.excel-root {
    background: var(--color-background);
    font-family: var(--font-family, Inter, system-ui, sans-serif);
}

/* ── ZTools Modern Grid ───────────────────────────── */
.native-grid {
    position: relative;
    background: var(--color-background);
}

.excel-table {
    border-spacing: 0;
    border-collapse: separate;
    table-layout: fixed;
    width: max-content;
}

.corner-header {
    position: sticky;
    top: 0;
    left: 0;
    z-index: 45;
    width: 48px;
    height: 36px;
    background: var(--color-surface);
    border-right: 1px solid var(--color-border);
    border-bottom: 1px solid var(--color-border);
}

.col-header {
    position: sticky;
    top: 0;
    z-index: 25;
    height: 36px;
    min-width: 120px;
    background: var(--color-surface);
    border-right: 1px solid var(--color-border);
    border-bottom: 1px solid var(--color-border);
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-secondary);
    text-align: center;
    transition: all 0.2s;

    &--active {
        background: var(--color-cta-faded);
        color: var(--color-cta);
        border-bottom: 2px solid var(--color-cta);
    }
}

.row-header {
    position: sticky;
    left: 0;
    z-index: 25;
    width: 48px;
    background: var(--color-surface);
    border-right: 1px solid var(--color-border);
    border-bottom: 1px solid var(--color-border);
    font-size: 10px;
    font-weight: 500;
    color: var(--color-secondary);
    text-align: center;
    transition: all 0.2s;

    &--active {
        background: var(--color-cta-faded);
        color: var(--color-cta);
        border-right: 2px solid var(--color-cta);
    }
}

.cell-wrapper {
    padding: 0;
    border-right: 1px dotted var(--color-border);
    border-bottom: 1px dotted var(--color-border);
    min-width: 120px;
    height: 48px;
    background: transparent;
    transition: all 0.2s;

    &:hover {
        background: var(--color-surface);
    }
}

.cell-content {
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 6px 12px;
    font-size: 13px;
    color: var(--color-text);
    overflow: hidden;
}

/* ── Diff States ──────────────────────────── */
.cell-modified {
    background: color-mix(in srgb, var(--color-warning) 10%, transparent) !important;
}

.cell-added {
    background: var(--color-insert-bg) !important;
}

.cell-removed {
    background: var(--color-delete-bg) !important;
}

.cell--active {
    position: relative;
    box-shadow: inset 0 0 0 2px var(--color-cta) !important;
    z-index: 30;
    background: var(--color-cta-faded) !important;
}

.val-old {
    color: var(--color-danger);
    text-decoration: line-through;
    font-size: 11px;
    opacity: 0.7;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.val-new {
    color: var(--color-success);
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.val-plain {
    opacity: 0.9;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

/* ── Side Labels ───────────────────────────── */
.side-label {
    position: sticky;
    top: 36px;
    left: 48px;
    z-index: 40;
    font-size: 10px;
    font-weight: 700;
    padding: 4px 12px;
    border-radius: 0 0 8px 0;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-top: none;
    border-left: none;
    backdrop-filter: blur(8px);
}

.source-label {
    color: var(--color-danger);
}

.target-label {
    color: var(--color-success);
}

/* ── Diff Bar ──────────────────────────────────────── */
.diff-icon-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 8px;
    transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    cursor: pointer;
}

.diff-icon--modified {
    color: #eab308;
    background-color: rgba(234, 179, 8, 0.1);
}

.diff-icon--added {
    color: #10b981;
    background-color: rgba(16, 185, 129, 0.1);
}

.diff-icon--removed {
    color: #ef4444;
    background-color: rgba(239, 68, 68, 0.1);
}

.diff-icon--active {
    transform: scale(1.15);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.diff-icon--active.diff-icon--modified {
    background-color: #eab308;
    color: white !important;
}

.diff-icon--active.diff-icon--added {
    background-color: #10b981;
    color: white !important;
}

.diff-icon--active.diff-icon--removed {
    background-color: #ef4444;
    color: white !important;
}

.dark .diff-icon--active.diff-icon--modified,
.dark .diff-icon--active.diff-icon--added,
.dark .diff-icon--active.diff-icon--removed {
    color: #111 !important;
}

.diff-icon-wrapper:hover:not(.diff-icon--active) {
    transform: scale(1.1);
    filter: brightness(1.2);
}

/* ── Sheet Tabs ────────────────────────────────────── */
.sheet-tab {
    height: 100%;
    display: flex;
    align-items: center;
    padding: 0 24px;
    background: transparent;
    border: none;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    color: var(--color-secondary);
    position: relative;
    transition: all 0.2s;

    &:hover {
        color: var(--color-text);
        background: var(--color-surface);
    }

    &--active {
        color: var(--color-cta);
        font-weight: 700;

        &::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 20%;
            right: 20%;
            height: 3px;
            background: var(--color-cta);
            border-radius: 3px 3px 0 0;
        }
    }
}

.sheet-diff-dot {
    width: 6px;
    height: 6px;
    background: var(--color-danger);
    border-radius: 50%;
    margin-left: 8px;
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

/* ── Transitions & Specific Highlights ─────────── */
.slide-right-enter-active,
.slide-right-leave-active {
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-right-enter-from,
.slide-right-leave-to {
    transform: translateX(100%);
}

.diff-item--active {
    border-color: var(--color-cta) !important;
    background: var(--color-cta-faded) !important;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}
</style>
