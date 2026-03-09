import { shallowRef } from 'vue'

export function useTextScroll() {
    const leftBack = shallowRef<HTMLElement | null>(null)
    const rightBack = shallowRef<HTMLElement | null>(null)
    const leftLineNumbers = shallowRef<HTMLElement | null>(null)
    const rightLineNumbers = shallowRef<HTMLElement | null>(null)

    const onLeftScroll = (e: Event) => {
        const target = e.target as HTMLTextAreaElement
        if (leftBack.value) {
            leftBack.value.scrollTop = target.scrollTop
            leftBack.value.scrollLeft = target.scrollLeft
        }
        if (leftLineNumbers.value) {
            leftLineNumbers.value.scrollTop = target.scrollTop
        }
    }

    const onRightScroll = (e: Event) => {
        const target = e.target as HTMLTextAreaElement
        if (rightBack.value) {
            rightBack.value.scrollTop = target.scrollTop
            rightBack.value.scrollLeft = target.scrollLeft
        }
        if (rightLineNumbers.value) {
            rightLineNumbers.value.scrollTop = target.scrollTop
        }
    }

    return {
        leftBack,
        rightBack,
        leftLineNumbers,
        rightLineNumbers,
        onLeftScroll,
        onRightScroll
    }
}