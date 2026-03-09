import { ref, onUnmounted, type Ref } from 'vue'

export function useScrollSync(viewMode: Ref<string>) {
    const sourceTableRef = ref<HTMLElement | null>(null)
    const targetTableRef = ref<HTMLElement | null>(null)
    const diffBarRef = ref<HTMLElement | null>(null)

    let isProgrammaticScroll = false
    let scrollTimeout: ReturnType<typeof setTimeout> | null = null
    let activeScrollTarget: HTMLElement | null = null
    let syncScrollTimeout: ReturnType<typeof setTimeout> | null = null

    const scrollToCell = (row: number, col: number, getElement: (r: number, c: number) => HTMLElement | null) => {
        const el = getElement(row, col)
        if (!el) return

        isProgrammaticScroll = true
        if (scrollTimeout) clearTimeout(scrollTimeout)
        scrollTimeout = setTimeout(() => {
            isProgrammaticScroll = false
        }, 1000)

        requestAnimationFrame(() => {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        })
    }

    const syncScroll = (e: Event) => {
        if (isProgrammaticScroll || viewMode.value !== 'split') return
        const source = sourceTableRef.value
        const target = targetTableRef.value
        const diffBar = diffBarRef.value
        if (!source || !target || !diffBar) return

        const scrollTarget = e.target as HTMLElement

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

    onUnmounted(() => {
        if (scrollTimeout) clearTimeout(scrollTimeout)
        if (syncScrollTimeout) clearTimeout(syncScrollTimeout)
    })

    return {
        sourceTableRef,
        targetTableRef,
        diffBarRef,
        scrollToCell,
        syncScroll,
    }
}