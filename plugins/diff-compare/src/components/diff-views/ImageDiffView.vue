<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

type ViewMode = 'split' | 'slider' | 'blend'

const sourceImage = ref<string | null>(null)
const targetImage = ref<string | null>(null)

const viewMode = ref<ViewMode>('split')

const leftDragOver = ref(false)
const rightDragOver = ref(false)

const sliderPos = ref(50)
const isDragging = ref(false)
const viewportRef = ref<HTMLElement | null>(null)

const blendOpacity = ref(0.5)

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
}

// ── Slider drag ───────────────────────────────────────
const startSliderDrag = () => { isDragging.value = true }

const onMouseMove = (e: MouseEvent) => {
    if (!isDragging.value || !viewportRef.value || viewMode.value !== 'slider') return
    const rect = viewportRef.value.getBoundingClientRect()
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
    sliderPos.value = (x / rect.width) * 100
}

const stopDrag = () => { isDragging.value = false }

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
    <div class="img-root">

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

            <!-- Toolbar -->
            <div
                class="h-14 border-b border-[var(--color-border)] bg-[var(--color-background)] flex items-center justify-between px-5 flex-shrink-0 z-30 shadow-sm relative">
                <div
                    class="flex bg-[var(--color-surface)] rounded-md border border-[var(--color-border)] p-1 shadow-sm">
                    <button class="mode-btn" :class="{ 'active': viewMode === 'split' }" @click="viewMode = 'split'">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                            <line x1="12" y1="3" x2="12" y2="21" />
                        </svg>
                        {{ t('viewSplit') }}
                    </button>
                    <button class="mode-btn" :class="{ 'active': viewMode === 'slider' }" @click="viewMode = 'slider'">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M11 2v20" />
                            <path d="m7 16-4-4 4-4" />
                            <path d="M13 2v20" />
                            <path d="m17 8 4 4-4 4" />
                        </svg>
                        {{ t('viewSlider') }}
                    </button>
                    <button class="mode-btn" :class="{ 'active': viewMode === 'blend' }" @click="viewMode = 'blend'">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="10" cy="10" r="7" />
                            <circle cx="14" cy="14" r="7" />
                        </svg>
                        {{ t('viewBlend') }}
                    </button>
                </div>

                <button class="clear-btn" @click="clearImages" :title="t('clearImages')">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 6h18" />
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    </svg>
                    {{ t('clearImages') }}
                </button>
            </div>

            <!-- Viewport -->
            <div class="flex-1 min-h-0 bg-checker relative flex w-full h-full" ref="viewportRef">

                <!-- SPLIT MODE -->
                <template v-if="viewMode === 'split'">
                    <div
                        class="w-1/2 h-full flex flex-col items-center p-5 border-r border-[var(--color-border)] relative">
                        <span class="view-pill absolute top-4 left-4 z-10">{{ t('imageSource') }}</span>
                        <img :src="sourceImage"
                            class="w-full h-full object-contain pointer-events-none drop-shadow-lg" />
                    </div>
                    <div class="w-1/2 h-full flex flex-col items-center p-5 relative">
                        <span class="view-pill absolute top-4 right-4 z-10">{{ t('imageTarget') }}</span>
                        <img :src="targetImage"
                            class="w-full h-full object-contain pointer-events-none drop-shadow-lg" />
                    </div>
                </template>

                <!-- SLIDER MODE -->
                <template v-else-if="viewMode === 'slider'">
                    <!-- Base Image (Modified) -->
                    <img :src="targetImage"
                        class="absolute inset-0 p-5 w-full h-full object-contain pointer-events-none drop-shadow-lg" />
                    <!-- Overlay Image (Original) clipped -->
                    <img :src="sourceImage"
                        class="absolute inset-0 p-5 w-full h-full object-contain pointer-events-none drop-shadow-lg"
                        :style="{ clipPath: `polygon(0 0, ${sliderPos}% 0, ${sliderPos}% 100%, 0 100%)` }" />

                    <div class="absolute top-4 left-4 z-10"><span class="view-pill">{{ t('imageSource') }}</span></div>
                    <div class="absolute top-4 right-4 z-10"><span class="view-pill">{{ t('imageTarget') }}</span></div>

                    <!-- Handle -->
                    <div class="absolute top-0 bottom-0 w-[2px] bg-[var(--color-cta)] cursor-ew-resize z-20 flex flex-col items-center justify-center transform -translate-x-1/2"
                        :style="{ left: `${sliderPos}%` }" @mousedown="startSliderDrag">
                        <div
                            class="w-8 h-8 rounded-full bg-[var(--color-cta)] border border-[var(--color-background)] shadow-md flex items-center justify-center pointer-events-none text-white transition-transform hover:scale-110">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
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
                    <!-- Base -->
                    <img :src="targetImage"
                        class="absolute inset-0 p-5 w-full h-full object-contain pointer-events-none drop-shadow-lg opacity-100" />
                    <!-- Crossfade Overlay -->
                    <img :src="sourceImage"
                        class="absolute inset-0 p-5 w-full h-full object-contain pointer-events-none drop-shadow-lg"
                        :style="{ opacity: blendOpacity }" />

                    <div class="absolute top-4 left-4 z-10"><span class="view-pill">{{ t('imageSource') }}</span></div>
                    <div class="absolute top-4 right-4 z-10"><span class="view-pill">{{ t('imageTarget') }}</span></div>

                    <!-- Control Box -->
                    <div
                        class="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 bg-[var(--color-background)] px-6 py-3 rounded-full border border-[var(--color-border)] shadow-xl flex items-center gap-4 transition-transform hover:scale-105">
                        <span
                            class="text-xs font-mono font-bold text-[var(--color-secondary)] uppercase tracking-widest w-14 text-right">Target</span>
                        <input type="range" min="0" max="1" step="0.01" v-model.number="blendOpacity"
                            class="w-40 accent-[var(--color-cta)] cursor-pointer" />
                        <span
                            class="text-xs font-mono font-bold text-[var(--color-secondary)] uppercase tracking-widest w-14 text-left">Source</span>
                    </div>
                </template>

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

/* ── Mode Toolbar Buttons ────────────────────────── */
.mode-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    border-radius: 5px;
    font-size: 12px;
    font-weight: 600;
    color: var(--color-secondary);
    background: transparent;
    border: none;
    cursor: pointer;
    transition: all 180ms ease;
    user-select: none;

    &:hover {
        color: var(--color-text);
    }

    &.active {
        background: var(--color-background);
        color: var(--color-cta);
        box-shadow: var(--shadow-sm);
        border-color: var(--color-border);
    }
}

.clear-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    color: var(--color-delete-text);
    background: color-mix(in srgb, var(--color-delete-text) 10%, transparent);
    border: 1px solid transparent;
    cursor: pointer;
    transition: all 150ms ease;

    &:hover {
        background: color-mix(in srgb, var(--color-delete-text) 15%, transparent);
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
