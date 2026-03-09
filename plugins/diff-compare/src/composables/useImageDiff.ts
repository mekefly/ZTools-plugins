import { ref, shallowRef, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import pixelmatch from 'pixelmatch'
import { readFileAsDataURL } from '@/utils/file'

type ViewMode = 'split' | 'slider' | 'blend' | 'highlight'

export function useImageDiff() {
    const sourceImage = shallowRef<string | null>(null)
    const targetImage = shallowRef<string | null>(null)
    const viewMode = ref<ViewMode>('split')

    const sliderPos = ref(50)
    const isDragging = ref(false)
    const isPanning = ref(false)
    const blendOpacity = ref(0.5)

    const zoom = ref(1)
    const panX = ref(0)
    const panY = ref(0)
    const lastMousePos = ref({ x: 0, y: 0 })

    const diffOverlay = shallowRef<string | null>(null)
    const isComputingDiff = ref(false)

    const bothLoaded = computed(() => !!sourceImage.value && !!targetImage.value)

    const loadImageObj = (src: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
            const img = new Image()
            img.onload = () => resolve(img)
            img.onerror = reject
            img.src = src
        })
    }

    const computePixelDiff = async () => {
        if (!sourceImage.value || !targetImage.value) return
        isComputingDiff.value = true
        try {
            const imgSrc = await loadImageObj(sourceImage.value)
            const imgTarget = await loadImageObj(targetImage.value)

            const width = Math.max(imgSrc.width, imgTarget.width)
            const height = Math.max(imgSrc.height, imgTarget.height)

            const c1 = document.createElement('canvas')
            c1.width = width
            c1.height = height
            const ctx1 = c1.getContext('2d')!
            ctx1.drawImage(imgSrc, 0, 0)
            const data1 = ctx1.getImageData(0, 0, width, height)

            const c2 = document.createElement('canvas')
            c2.width = width
            c2.height = height
            const ctx2 = c2.getContext('2d')!
            ctx2.drawImage(imgTarget, 0, 0)
            const data2 = ctx2.getImageData(0, 0, width, height)

            const diffCanvas = document.createElement('canvas')
            diffCanvas.width = width
            diffCanvas.height = height
            const diffCtx = diffCanvas.getContext('2d')!
            const diffData = diffCtx.createImageData(width, height)

            pixelmatch(data1.data, data2.data, diffData.data, width, height, {
                threshold: 0.1,
                alpha: 0.5,
                includeAA: true,
                diffColor: [255, 0, 0],
            })

            diffCtx.putImageData(diffData, 0, 0)
            diffOverlay.value = diffCanvas.toDataURL()
        } catch (e) {
            console.error('Failed to compute diff:', e)
        } finally {
            isComputingDiff.value = false
        }
    }

    watch([viewMode, sourceImage, targetImage], () => {
        if (viewMode.value === 'highlight' && bothLoaded.value) {
            computePixelDiff()
        }
    })

    const handleFileInput = async (e: Event, side: 'source' | 'target') => {
        const input = e.target as HTMLInputElement
        const files = input.files
        if (!files || files.length === 0) return

        if (files.length >= 2) {
            sourceImage.value = await readFileAsDataURL(files[0])
            targetImage.value = await readFileAsDataURL(files[1])
        } else {
            const url = await readFileAsDataURL(files[0])
            if (side === 'source') sourceImage.value = url
            else targetImage.value = url
        }
        input.value = ''
    }

    const clearImages = () => {
        sourceImage.value = null
        targetImage.value = null
        diffOverlay.value = null
        sliderPos.value = 50
        blendOpacity.value = 0.5
        viewMode.value = 'split'
        resetTransform()
    }

    const resetTransform = () => {
        zoom.value = 1
        panX.value = 0
        panY.value = 0
    }

    const startSliderDrag = (e: MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        isDragging.value = true
        nextTick()
    }

    const startPan = (e: MouseEvent) => {
        // In slider mode, disable panning - only allow slider handle to be dragged
        if (viewMode.value === 'slider') return
        
        isPanning.value = true
        lastMousePos.value = { x: e.clientX, y: e.clientY }
    }

    const handleWheel = (e: WheelEvent) => {
        e.preventDefault()
        const delta = -e.deltaY
        const zoomSpeed = 0.001
        const newZoom = Math.max(0.1, Math.min(zoom.value + delta * zoomSpeed, 10))
        zoom.value = newZoom
    }

    let viewportRef = shallowRef<HTMLDivElement | null>(null)
    const onMouseMove = (e: MouseEvent) => {
        console.log(isDragging.value,viewMode.value,viewportRef)
        if (isDragging.value && viewMode.value === 'slider' && viewportRef) {
            const rect = viewportRef.value.getBoundingClientRect()
            const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
            sliderPos.value = (x / rect.width) * 100
        } else if (isPanning.value) {
            const dx = e.clientX - lastMousePos.value.x
            const dy = e.clientY - lastMousePos.value.y
            panX.value += dx
            panY.value += dy
            lastMousePos.value = { x: e.clientX, y: e.clientY }
        }
    }

    const stopDrag = () => {
        isDragging.value = false
        isPanning.value = false
    }

    const imageTransform = computed(() => ({
        transform: `translate(${panX.value}px, ${panY.value}px) scale(${zoom.value})`,
        transition: isPanning.value ? 'none' : 'transform 0.1s ease-out',
    }))

    onMounted(() => {
        window.addEventListener('mousemove', onMouseMove)
        window.addEventListener('mouseup', stopDrag)
    })

    onUnmounted(() => {
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseup', stopDrag)
    })

    return {
        sourceImage,
        targetImage,
        viewMode,
        sliderPos,
        isDragging,
        blendOpacity,
        zoom,
        panX,
        panY,
        diffOverlay,
        isComputingDiff,
        bothLoaded,
        handleFileInput,
        clearImages,
        resetTransform,
        startSliderDrag,
        startPan,
        handleWheel,
        imageTransform,
        viewportRef
    }
}