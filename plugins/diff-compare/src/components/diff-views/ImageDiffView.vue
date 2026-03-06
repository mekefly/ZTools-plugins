<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import ZTooltip from '@/components/ui/base/ZTooltip.vue'
import ZBadge from '@/components/ui/base/ZBadge.vue'
import ZButton from '@/components/ui/base/ZButton.vue'

const { locale, t } = useI18n()

type ViewMode = 'split' | 'slider' | 'blend' | 'difference'

const sourceImage = ref<string | null>(null)
const targetImage = ref<string | null>(null)

const viewMode = ref<ViewMode>('split')

const leftDragOver = ref(false)
const rightDragOver = ref(false)

const sliderPos = ref(50)
const isDragging = ref(false)
const isPanning = ref(false)
const viewportRef = ref<HTMLElement | null>(null)

const blendOpacity = ref(0.5)

// Zoom & Pan state
const zoom = ref(1)
const panX = ref(0)
const panY = ref(0)
const lastMousePos = ref({ x: 0, y: 0 })

const bothLoaded = computed(() => !!sourceImage.value && !!targetImage.value)

// ── File loading ─────────────────────────────────────
const readFile = (file: File): Promise<string> =>
    new Promise((resolve) => {
        const r = new FileReader()
        r.onload = (e) => resolve(e.target!.result as string)
        r.readAsDataURL(file)
    })

const handleFileInput = async (e: Event, side: 'source' | 'target') => {
    const input = e.target as HTMLInputElement
    if (!input.files?.[0]) return
    const url = await readFile(input.files[0])
    if (side === 'source') sourceImage.value = url
    else targetImage.value = url
    input.value = ''
}

const handleDrop = async (e: DragEvent, side: 'source' | 'target') => {
    e.preventDefault()
    if (side === 'source') leftDragOver.value = false
    else rightDragOver.value = false
    const file = e.dataTransfer?.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    const url = await readFile(file)
    if (side === 'source') sourceImage.value = url
    else targetImage.value = url
}

const clearImages = () => {
    sourceImage.value = null
    targetImage.value = null
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

// ── Interaction ───────────────────────────────────────
const startSliderDrag = (e: MouseEvent) => {
    e.stopPropagation()
    isDragging.value = true
}

const startPan = (e: MouseEvent) => {
    if (viewMode.value === 'slider' && isDragging.value) return
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

const onMouseMove = (e: MouseEvent) => {
    if (isDragging.value && viewMode.value === 'slider' && viewportRef.value) {
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
    transition: isPanning.value ? 'none' : 'transform 0.1s ease-out'
}))

onMounted(() => {
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', stopDrag)
})
onUnmounted(() => {
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', stopDrag)
})
</script>

<template>
    <div class="img-root flex-col">
        <!-- Always Toolbar -->
        <div
            class="h-14 border-b border-[var(--color-border)] bg-[var(--color-background)] flex items-center justify-between px-5 flex-shrink-0 z-30 shadow-sm relative w-full">
            <div class="flex bg-[var(--color-surface)] rounded-md border border-[var(--color-border)] p-1 shadow-sm opacity-100 transition-opacity"
                :class="{ 'pointer-events-none opacity-50': !bothLoaded }">
                <ZButton :variant="viewMode === 'split' ? 'primary' : 'surface'" size="sm" @click="viewMode = 'split'"
                    class="!rounded-md">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                        <line x1="12" y1="3" x2="12" y2="21" />
                    </svg>
                    {{ t('viewSplit') }}
                </ZButton>
                <ZButton :variant="viewMode === 'slider' ? 'primary' : 'surface'" size="sm" @click="viewMode = 'slider'"
                    class="!rounded-md">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M11 2v20" />
                        <path d="m7 16-4-4 4-4" />
                        <path d="M13 2v20" />
                        <path d="m17 8 4 4-4 4" />
                    </svg>
                    {{ t('viewSlider') }}
                </ZButton>
                <ZButton :variant="viewMode === 'blend' ? 'primary' : 'surface'" size="sm" @click="viewMode = 'blend'"
                    class="!rounded-md">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="10" cy="10" r="7" />
                        <circle cx="14" cy="14" r="7" />
                    </svg>
                    {{ t('viewBlend') }}
                </ZButton>
                <ZButton :variant="viewMode === 'difference' ? 'primary' : 'surface'" size="sm"
                    @click="viewMode = 'difference'" class="!rounded-md">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 3v18" />
                        <path d="M3 12h18" />
                        <path d="m18 15 3-3-3-3" />
                        <path d="m6 9-3 3 3 3" />
                    </svg>
                    {{ t('viewDifference') }}
                </ZButton>
            </div>

            <div class="flex items-center gap-4">
                <div v-if="bothLoaded" class="flex items-center gap-2">
                    <ZBadge variant="surface" size="xs">{{ t('zoom') || 'Zoom' }}</ZBadge>
                    <span class="text-xs font-mono font-bold text-[var(--color-secondary)]">{{ Math.round(zoom * 100)
                        }}%</span>
                </div>

                <div class="flex gap-2">
                    <ZTooltip :content="t('resetZoom')">
                        <ZButton variant="surface" size="sm" @click="resetTransform" :disabled="!bothLoaded"
                            class="text-[var(--color-cta)]">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                                fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"
                                stroke-linejoin="round">
                                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                                <path d="M3 3v5h5" />
                            </svg>
                        </ZButton>
                    </ZTooltip>
                    <ZTooltip :content="t('clearImages')">
                        <ZButton variant="danger" size="sm" @click="clearImages"
                            :disabled="!sourceImage && !targetImage">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                                fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"
                                stroke-linejoin="round">
                                <path d="M3 6h18" />
                                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                            </svg>
                            {{ t('clearImages') }}
                        </ZButton>
                    </ZTooltip>
                </div>
            </div>
        </div>

        <!-- Main Content Area: Setup or Workspace -->
        <div class="flex flex-1 min-h-0 relative overflow-hidden">
            <!-- UNLOADED STATE: Two Dropzones side-by-side -->
            <div v-if="!bothLoaded" class="img-setup flex-1 flex">

                <!-- Left Source -->
                <div class="img-panel" :class="{ 'has-img': sourceImage }">
                    <label v-if="!sourceImage" class="img-dropzone bg-checker"
                        :class="{ 'img-dropzone--active': leftDragOver }" @dragover.prevent="leftDragOver = true"
                        @dragleave="leftDragOver = false" @drop="handleDrop($event, 'source')">
                        <input type="file" accept="image/*" class="img-file-input"
                            @change="handleFileInput($event, 'source')" />

                        <div class="img-dropzone-card" :class="{ 'img-dropzone-card--active': leftDragOver }">
                            <div class="img-dz-icon-wrap">
                                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24"
                                    fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                                    stroke-linejoin="round" class="img-dz-icon">
                                    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                                    <circle cx="9" cy="9" r="2" />
                                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                                </svg>
                            </div>
                            <p class="img-dz-title">{{ t('imageSource') }}</p>
                            <p class="img-dz-hint">{{ t('uploadImage') }}</p>
                        </div>
                    </label>
                    <div v-else
                        class="img-preview relative w-full h-full flex flex-col items-center justify-center p-6 bg-checker">
                        <span class="view-pill absolute top-4 left-4">{{ t('imageSource') }}</span>
                        <img :src="sourceImage" class="w-full flex-1 object-contain drop-shadow-md" />
                    </div>
                </div>

                <div class="w-px bg-[var(--color-border)] flex-shrink-0"></div>

                <!-- Right Target -->
                <div class="img-panel" :class="{ 'has-img': targetImage }">
                    <label v-if="!targetImage" class="img-dropzone bg-checker"
                        :class="{ 'img-dropzone--active': rightDragOver }" @dragover.prevent="rightDragOver = true"
                        @dragleave="rightDragOver = false" @drop="handleDrop($event, 'target')">
                        <input type="file" accept="image/*" class="img-file-input"
                            @change="handleFileInput($event, 'target')" />

                        <div class="img-dropzone-card" :class="{ 'img-dropzone-card--active': rightDragOver }">
                            <div class="img-dz-icon-wrap">
                                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24"
                                    fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                                    stroke-linejoin="round" class="img-dz-icon">
                                    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                                    <circle cx="9" cy="9" r="2" />
                                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                                </svg>
                            </div>
                            <p class="img-dz-title">{{ t('imageTarget') }}</p>
                            <p class="img-dz-hint">{{ t('uploadImage') }}</p>
                        </div>
                    </label>
                    <div v-else
                        class="img-preview relative w-full h-full flex flex-col items-center justify-center p-6 bg-checker">
                        <span class="view-pill absolute top-4 right-4">{{ t('imageTarget') }}</span>
                        <img :src="targetImage" class="w-full flex-1 object-contain drop-shadow-md" />
                    </div>
                </div>

            </div>

            <!-- LOADED STATE: Full viewport with modes -->
            <div v-else class="img-workspace flex flex-col h-full flex-1 min-h-0">

                <!-- Viewport -->
                <div class="flex-1 min-h-0 bg-checker relative flex w-full h-full overflow-hidden cursor-grab active:cursor-grabbing"
                    ref="viewportRef" @wheel="handleWheel" @mousedown.prevent="startPan">

                    <!-- SPLIT MODE -->
                    <template v-if="viewMode === 'split'">
                        <div
                            class="w-1/2 h-full flex flex-col items-center p-5 border-r border-[var(--color-border)] relative overflow-hidden">
                            <span class="view-pill absolute top-4 left-4 z-10">{{ t('imageSource') }}</span>
                            <div class="w-full h-full flex items-center justify-center pointer-events-none"
                                :style="imageTransform">
                                <img :src="sourceImage" :draggable="false"
                                    class="max-w-full max-h-full object-contain drop-shadow-lg" />
                            </div>
                        </div>
                        <div class="w-1/2 h-full flex flex-col items-center p-5 relative overflow-hidden">
                            <span class="view-pill absolute top-4 right-4 z-10">{{ t('imageTarget') }}</span>
                            <div class="w-full h-full flex items-center justify-center pointer-events-none"
                                :style="imageTransform">
                                <img :src="targetImage" :draggable="false"
                                    class="max-w-full max-h-full object-contain drop-shadow-lg" />
                            </div>
                        </div>
                    </template>

                    <!-- SLIDER MODE -->
                    <template v-else-if="viewMode === 'slider'">
                        <!-- Viewport containing both images -->
                        <div class="absolute inset-0 overflow-hidden pointer-events-none">

                            <!-- Base Layer (Target) -->
                            <div class="absolute inset-0" :style="imageTransform">
                                <div class="w-full h-full p-8 flex items-center justify-center">
                                    <img :src="targetImage" :draggable="false"
                                        class="max-w-full max-h-full object-contain drop-shadow-xl" />
                                </div>
                            </div>

                            <!-- Overlay Layer (Source) - Clipped -->
                            <div class="absolute inset-0" :style="{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }">
                                <div class="absolute inset-0" :style="imageTransform">
                                    <div class="w-full h-full p-8 flex items-center justify-center">
                                        <img :src="sourceImage" :draggable="false"
                                            class="max-w-full max-h-full object-contain drop-shadow-xl" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="absolute top-4 left-4 z-10"><span class="view-pill">{{ t('imageSource') }}</span>
                        </div>
                        <div class="absolute top-4 right-4 z-10"><span class="view-pill">{{ t('imageTarget') }}</span>
                        </div>

                        <!-- Handle -->
                        <div class="absolute top-0 bottom-0 w-[2px] bg-[var(--color-cta)] cursor-ew-resize z-20 flex flex-col items-center justify-center transform -translate-x-1/2"
                            :style="{ left: `${sliderPos}%` }" @mousedown.prevent="startSliderDrag">
                            <div
                                class="cursor-ew-resize w-10 h-10 rounded-full bg-[var(--color-cta)] border-2 border-[var(--color-background)] shadow-2xl flex items-center justify-center pointer-events-none text-white transition-transform hover:scale-110">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
                                    fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"
                                    stroke-linejoin="round">
                                    <path d="m9 18-6-6 6-6" />
                                    <path d="m15 6 6 6-6 6" />
                                </svg>
                            </div>
                        </div>
                    </template>

                    <!-- BLEND MODE -->
                    <template v-else-if="viewMode === 'blend'">
                        <div class="absolute inset-0 overflow-hidden pointer-events-none" :style="imageTransform">
                            <div class="relative w-full h-full p-8 flex items-center justify-center">
                                <!-- Base -->
                                <img :src="targetImage" :draggable="false"
                                    class="max-w-full max-h-full object-contain drop-shadow-xl" />
                                <!-- Crossfade Overlay -->
                                <img :src="sourceImage" :draggable="false"
                                    class="absolute max-w-full max-h-full object-contain drop-shadow-xl" :style="{
                                        opacity: blendOpacity,
                                        width: 'auto',
                                        height: 'auto',
                                        maxWidth: 'calc(100% - 64px)',
                                        maxHeight: 'calc(100% - 64px)'
                                    }" />
                            </div>
                        </div>

                        <div class="absolute top-4 left-4 z-10">
                            <ZBadge variant="surface" size="sm">{{ t('imageSource') }}</ZBadge>
                        </div>
                        <div class="absolute top-4 right-4 z-10">
                            <ZBadge variant="surface" size="sm">{{ t('imageTarget') }}</ZBadge>
                        </div>

                        <!-- Control Box -->
                        <div class="blend-control" @mousedown.stop>
                            <span class="blend-label">Target</span>
                            <div class="blend-slider-wrap">
                                <input type="range" min="0" max="1" step="0.01" v-model.number="blendOpacity"
                                    class="blend-slider" />
                            </div>
                            <span class="blend-label">Source</span>
                        </div>
                    </template>

                    <!-- DIFFERENCE MODE -->
                    <template v-else-if="viewMode === 'difference'">
                        <div class="absolute inset-0 overflow-hidden pointer-events-none" :style="imageTransform">
                            <div class="relative w-full h-full p-8 flex items-center justify-center">
                                <img :src="targetImage" class="max-w-full max-h-full object-contain" />
                                <img :src="sourceImage"
                                    class="absolute max-w-full max-h-full object-contain mix-blend-difference" :style="{
                                        width: 'auto',
                                        height: 'auto',
                                        maxWidth: 'calc(100% - 64px)',
                                        maxHeight: 'calc(100% - 64px)'
                                    }" />
                            </div>
                        </div>
                        <div class="absolute top-4 left-1/2 -translate-x-1/2 z-10">
                            <span class="view-pill">{{ t('viewDifference') }}</span>
                        </div>
                    </template>

                </div>
            </div>
        </div>
    </div>

</template>

<style scoped lang="scss">
/* ── Root ────────────────────────────────────────── */
.img-root {
    display: flex;
    flex: 1;
    min-height: 0;
    border: 1px solid var(--color-border);
    border-radius: 10px;
    overflow: hidden;
    background: var(--color-background);
    user-select: none;
    /* Prevent accidental text/image selection */
}

.img-panel {
    flex: 1;
    min-width: 0;
    min-height: 0;
    position: relative;
    display: flex;
    flex-direction: column;
}

/* ── Checkerboard background ─────────────────────── */
.bg-checker {
    background-color: color-mix(in srgb, var(--color-background) 50%, var(--color-surface));
    background-image:
        linear-gradient(45deg, color-mix(in srgb, var(--color-border) 20%, transparent) 25%, transparent 25%),
        linear-gradient(-45deg, color-mix(in srgb, var(--color-border) 20%, transparent) 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, color-mix(in srgb, var(--color-border) 20%, transparent) 75%),
        linear-gradient(-45deg, transparent 75%, color-mix(in srgb, var(--color-border) 20%, transparent) 75%);
    background-size: 20px 20px;
    background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
}

/* ── Dropzone ────────────────────────────────────── */
.img-dropzone {
    position: relative;
    flex: 1;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 200ms ease;

    &:hover,
    &--active {
        background: color-mix(in srgb, var(--color-cta) 4%, transparent);
    }

    &--active {
        outline: 2px dashed var(--color-cta);
        outline-offset: -2px;
    }

    /* Hover effect handled by parent label hover */
    &:hover .img-dropzone-card,
    &--active .img-dropzone-card {
        border-color: var(--color-cta);
        box-shadow: var(--shadow-md);
        transform: translateY(-2px);
        background: color-mix(in srgb, var(--color-cta) 4%, var(--color-background));
    }

    &:hover .img-dz-icon-wrap,
    &--active .img-dz-icon-wrap {
        background: color-mix(in srgb, var(--color-cta) 15%, transparent);
    }

    &:hover .img-dz-icon,
    &--active .img-dz-icon {
        color: var(--color-cta);
    }
}

.img-file-input {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
    z-index: 10;
    width: 100%;
    height: 100%;
}

.img-dropzone-card {
    position: relative;
    width: 280px;
    padding: 36px 24px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    background: var(--color-background);
    border: 2px dashed var(--color-border);
    border-radius: 16px;
    box-shadow: var(--shadow-sm);
    transition: all 200ms ease;
    user-select: none;
    pointer-events: none;
    /* Let label handle clicks */
}

/* Hover effect handled by parent label hover */
.img-dropzone:hover .img-dropzone-card,
.img-dropzone-card--active {
    border-color: var(--color-cta);
    box-shadow: var(--shadow-md);
    transform: translateY(-2px);
    background: color-mix(in srgb, var(--color-cta) 4%, var(--color-background));
}

.img-dz-icon-wrap {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: color-mix(in srgb, var(--color-border) 20%, transparent);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 8px;
    transition: all 200ms ease;
}

.img-dropzone:hover .img-dz-icon-wrap,
.img-dropzone-card--active .img-dz-icon-wrap {
    background: color-mix(in srgb, var(--color-cta) 15%, transparent);
}

.img-dz-icon {
    color: var(--color-secondary);
    transition: color 200ms ease;
}

.img-dropzone:hover .img-dz-icon,
.img-dropzone-card--active .img-dz-icon {
    color: var(--color-cta);
}

.img-dz-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--color-text);
    margin: 0;
}

.img-dz-hint {
    font-size: 12px;
    color: var(--color-secondary);
    opacity: 0.8;
    margin: 0;
    text-align: center;
}

/* ── Blend Mode Control ────────────────────────── */
.blend-control {
    position: absolute;
    bottom: 32px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 40;
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 12px 24px;
    border-radius: 99px;
    background: color-mix(in srgb, var(--color-background) 85%, transparent);
    backdrop-filter: blur(12px);
    border: 1px solid var(--color-border);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    pointer-events: auto;

    &:hover {
        transform: translateX(-50%) translateY(-2px);
        background: color-mix(in srgb, var(--color-background) 92%, transparent);
        border-color: var(--color-cta);
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
    }
}

.blend-label {
    font-size: 10px;
    font-weight: 800;
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--color-secondary);
    width: 60px;
}

.blend-control .blend-label:first-child {
    text-align: right;
}

.blend-slider-wrap {
    width: 200px;
    display: flex;
    align-items: center;
}

.blend-slider {
    width: 100%;
    height: 4px;
    appearance: none;
    -webkit-appearance: none;
    background: var(--color-border);
    border-radius: 2px;
    outline: none;
    cursor: pointer;

    &::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 14px;
        height: 14px;
        background: var(--color-cta);
        border-radius: 50%;
        border: 2px solid var(--color-background);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        transition: all 0.2s ease;
    }

    &::-webkit-slider-thumb:hover {
        transform: scale(1.2);
        box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-cta) 20%, transparent);
    }
}

/* ── View Pills / Labels ─────────────────────────── */
.view-pill {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.05em;
    padding: 4px 10px;
    border-radius: 6px;
    background: var(--color-background);
    color: var(--color-secondary);
    border: 1px solid var(--color-border);
    pointer-events: none;
    backdrop-filter: blur(4px);
    background: color-mix(in srgb, var(--color-background) 80%, transparent);
}
</style>
