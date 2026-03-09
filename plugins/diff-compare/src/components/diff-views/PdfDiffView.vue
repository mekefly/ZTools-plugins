<script setup lang="ts">
import { shallowRef, onMounted, onUnmounted } from "vue";
import { useI18n } from "vue-i18n";
import ZBadge from "@/components/ui/base/ZBadge.vue";
import ZButton from "@/components/ui/base/ZButton.vue";
import ZTooltip from "@/components/ui/base/ZTooltip.vue";
import FileDropzone from "@/components/shared/FileDropzone.vue";
import DiffBar from "@/components/shared/DiffBar.vue";
import DiffLegend from "@/components/shared/DiffLegend.vue";
import PrevNextButtons from "@/components/shared/PrevNextButtons.vue";
import { usePdfDiff } from "@/composables/usePdfDiff";

const { t } = useI18n();

const sourceViewerRef = shallowRef<HTMLElement | null>(null)
const targetViewerRef = shallowRef<HTMLElement | null>(null)

const {
  sourceFileName,
  targetFileName,
  loading,
  loadError,
  ocrStatus,
  ocrEngine,
  bothLoaded,
  diffBlocks,
  isDiffing,
  activeBlockIdx,
  showHighlights,
  diffCount,
  processFile,
  clearItems,
  processPaste,
  scrollToBlock,
  goToNextDiff,
  goToPrevDiff,
  toggleHighlights,
} = usePdfDiff()

const handleClear = () => clearItems(sourceViewerRef.value, targetViewerRef.value)
const handleToggleHighlight = () => toggleHighlights(sourceViewerRef.value, targetViewerRef.value)
const handleScroll = (idx: number) => scrollToBlock(idx, sourceViewerRef.value, targetViewerRef.value)
const handleNext = () => {
  const next = goToNextDiff()
  if (next !== undefined) scrollToBlock(next, sourceViewerRef.value, targetViewerRef.value)
}
const handlePrev = () => {
  const prev = goToPrevDiff()
  if (prev !== undefined) scrollToBlock(prev, sourceViewerRef.value, targetViewerRef.value)
}
const handleFile = (e: Event, side: "source" | "target") => {
  processFile(e, side, () => sourceViewerRef.value, () => targetViewerRef.value)
}
const handlePaste = (e: ClipboardEvent) => {
  processPaste(e, () => sourceViewerRef.value, () => targetViewerRef.value)
}

onMounted(() => {
  window.addEventListener("paste", handlePaste)
})
onUnmounted(() => {
  window.removeEventListener("paste", handlePaste)
})
</script>

<template>
  <div class="pdf-root flex flex-col h-full overflow-hidden">
    <!-- Toolbar -->
    <div
      class="h-11 border-b border-[var(--color-border)] bg-[var(--color-background)] flex items-center gap-3 px-4 flex-shrink-0 z-30 shadow-sm">
      <!-- 左侧：源文件名 -->
      <div class="w-[180px] min-w-0 flex items-center gap-2 flex-shrink-0">
        <ZBadge v-if="sourceFileName" :title="sourceFileName" variant="surface" size="lg">
          {{ sourceFileName }}
        </ZBadge>
        <ZBadge v-else :title="t('pdfSource')" variant="surface" size="lg">
          {{ t("pdfSource") }}
        </ZBadge>
      </div>

      <!-- 中间：OCR选择 + 差异数量 + 导航 -->
      <div class="flex-1 flex items-center justify-center gap-2 min-w-0">
        <!-- OCR引擎选择 -->
        <div class="flex items-center gap-1 mr-2">
          <span class="text-xs text-[var(--color-secondary)] mr-1">OCR:</span>
          <ZTooltip content="PDF.js内置文本提取 (快速，适用于可选中文本)">
            <ZButton variant="ghost" size="sm" :active="ocrEngine === 'pdfjs'" @click="ocrEngine = 'pdfjs'"
              class="!px-2 !h-6 text-xs">
              PDF.js
            </ZButton>
          </ZTooltip>
          <ZTooltip content="Tesseract.js OCR (纯前端，需等待两个文件都加载)">
            <ZButton variant="ghost" size="sm" :active="ocrEngine === 'tesseract'" @click="ocrEngine = 'tesseract'"
              class="!px-2 !h-6 text-xs">
              Tesseract
            </ZButton>
          </ZTooltip>
        </div>

        <template v-if="bothLoaded">
          <div v-if="diffCount > 0" class="flex items-center gap-1.5">
            <ZTooltip :content="showHighlights ? t('hideHighlights') || '隐藏高亮' : t('showHighlights') || '显示高亮'">
              <ZButton variant="ghost" size="sm" :active="showHighlights" @click="handleToggleHighlight"
                class="!px-2 !h-6 text-xs">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2" class="mr-1">
                  <path d="M12 3c-1.5 0-2 .5-2 2s.5 2 2 2 2-.5 2-2-.5-2-2-2z" />
                  <path d="M12 22c1.5 0 2-.5 2-2s-.5-2-2-2-2 .5-2 2 .5 2 2 2z" />
                  <path d="M12 14c-1.5 0-2 .5-2 2s.5 2 2 2 2-.5 2-2-.5-2-2-2z" />
                  <path d="M5 12H3" />
                  <path d="M21 12h-2" />
                  <path d="M12 5v2" />
                  <path d="M12 17v2" />
                </svg>
                {{ t("highlight") || "高亮" }}
              </ZButton>
            </ZTooltip>
            <div
              class="flex items-center gap-1.5 bg-[var(--color-surface)] rounded-md border border-[var(--color-border)] px-2 py-1">
              <span class="text-xs font-medium text-[var(--color-cta)] cursor-pointer" @click="handleNext">
                {{ t("pdfDiffCount", { n: diffCount }) }}
              </span>
              <PrevNextButtons :prev-label="t('prevChange')" :next-label="t('nextChange')" @prev="handlePrev"
                @next="handleNext" />
            </div>
          </div>
          <span v-else class="text-xs text-[var(--color-secondary)]">
            {{ t("pdfNoDiff") }}
          </span>
        </template>

        <ZTooltip :content="t('clearItems')" v-if="bothLoaded">
          <ZButton variant="ghost" size="icon-sm" @click="handleClear"
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
        <ZBadge v-if="targetFileName" :title="targetFileName" variant="surface" size="lg">
          {{ targetFileName }}
        </ZBadge>
        <ZBadge v-else variant="surface" size="lg" class="opacity-60">
          {{ t("pdfTarget") }}
        </ZBadge>
      </div>
    </div>

    <!-- Main Content -->
    <div class="flex-1 overflow-hidden relative bg-[var(--color-surface)]">
      <!-- Dropzones -->
      <div v-if="!bothLoaded" class="h-full flex gap-4 p-5">
        <FileDropzone side="source" :title="t('pdfSource')" :hint="t('uploadPdf')" :is-ready="!!sourceViewerRef"
          :fileName="sourceFileName" accept=".pdf" @change="handleFile($event, 'source')">
          <template #icon>
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" x2="8" y1="13" y2="13" />
              <line x1="16" x2="8" y1="17" y2="17" />
            </svg>
          </template>
        </FileDropzone>
        <FileDropzone side="target" :title="t('pdfTarget')" :hint="t('uploadPdf')" :is-ready="!!targetViewerRef"
          :fileName="targetFileName" accept=".pdf" @change="handleFile($event, 'target')">
          <template #icon>
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" x2="8" y1="13" y2="13" />
              <line x1="16" x2="8" y1="17" y2="17" />
            </svg>
          </template>
        </FileDropzone>
      </div>

      <!-- Error -->
      <div v-if="loadError"
        class="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg bg-red-500/20 text-red-500 text-sm border border-red-500/30 z-50">
        {{ loadError }}
      </div>

      <!-- Loading -->
      <div v-if="loading || isDiffing"
        class="absolute inset-0 flex items-center justify-center bg-[var(--color-background)]/80 z-40">
        <div class="flex flex-col items-center gap-3">
          <svg class="animate-spin h-8 w-8 text-[var(--color-cta)]" xmlns="http://www.w3.org/2000/svg" fill="none"
            viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
            </path>
          </svg>
          <span class="text-sm font-medium">{{ ocrStatus || (loading ? t("pdfRendering") : t("computingDiff")) }}</span>
        </div>
      </div>

      <!-- PDF View -->
      <div v-if="bothLoaded" class="h-full flex overflow-hidden bg-[var(--color-background)]">
        <!-- Left: Source PDF Viewer -->
        <div ref="leftPanelRef"
          class="flex-1 overflow-auto border-r border-[var(--color-border)] custom-scrollbar pdf-panel">
          <div ref="sourceViewerRef" class="pdf-viewer"></div>
        </div>

        <!-- Center: Diff Bar -->
        <DiffBar :title="t('pdfDiffShort') || t('diffResult')" :items="diffBlocks" :active-index="activeBlockIdx"
          @item-click="handleScroll" />

        <!-- Right: Target PDF Viewer -->
        <div ref="rightPanelRef" class="flex-1 overflow-auto custom-scrollbar pdf-panel">
          <div ref="targetViewerRef" class="pdf-viewer"></div>
        </div>
      </div>

      <!-- Footer Legend -->
      <DiffLegend v-if="bothLoaded" :items="[
        { label: t('removed'), swatchClass: 'bg-red-200 border border-red-300' },
        { label: t('modified'), swatchClass: 'bg-yellow-200 border border-yellow-300' },
        { label: t('added'), swatchClass: 'bg-green-200 border border-green-300' },
      ]" class="absolute bottom-0 left-0 right-0" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.pdf-root {
  background: var(--color-background);
}

.pdf-panel {
  background: #525659;
}

.pdf-viewer {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
  gap: 16px;
  min-height: 100%;
}

::deep(.pdf-page-wrapper) {
  background: white;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  overflow: visible;
  position: relative;
}

::deep(.pdf-canvas-container) {
  position: relative;
  line-height: 0;
}

::deep(.pdf-highlight-layer) {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 10;
  overflow: hidden;
}

::deep(.pdf-canvas) {
  display: block;
  max-width: 100%;
  height: auto;
}

::deep(.pdf-highlight-layer) {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 10;
}

::deep(.pdf-highlight) {
  position: absolute;
  border-radius: 2px;
  transition: all 0.2s ease;
}

::deep(.pdf-highlight-delete) {
  background-color: rgba(255, 0, 0, 0.25);
  border-bottom: 2px solid #ff0000;
}

::deep(.pdf-highlight-insert) {
  background-color: rgba(0, 200, 0, 0.25);
  border-bottom: 2px solid #00c800;
}

::deep(.pdf-highlight-modified) {
  background-color: rgba(255, 165, 0, 0.25);
  border-bottom: 2px solid #ffa500;
}

::deep(.pdf-highlight-active) {
  box-shadow: 0 0 0 3px var(--color-cta);
  z-index: 10;
}

.custom-scrollbar {
  &::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.1);
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 4px;

    &:hover {
      background: rgba(255, 255, 255, 0.3);
    }
  }
}
</style>
