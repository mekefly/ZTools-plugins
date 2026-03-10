<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import { useI18n } from "vue-i18n";
import ZSelect from "@/components/ui/ZSelect.vue";
import ZTooltip from "@/components/ui/ZTooltip.vue";
import ZButton from "@/components/ui/ZButton.vue";
import ZBadge from "@/components/ui/ZBadge.vue";
import ZIcon from "@/components/ui/ZIcon.vue";
import DiffBar from "@/components/shared/DiffBar.vue";
import { detectLanguage } from "@/utils/formatter";
import { useTextDiff } from "@/composables/useText";
import { useAutoFormat } from "@/composables/useText";
import { useSyntaxHighlight, langOptions } from "@/composables/useText";
import 'highlight.js/styles/dark.min.css'

const { t } = useI18n();
const textViewMode = ref<"split" | "unified">("split");
const selectedLang = ref("auto");

const {
  sourceText,
  targetText,
  diffLines,
  isDiffing,
  leftLines,
  rightLines,
  addedCount,
  removedCount,
  changeIndices,
  unifiedDiffLines,
  swapTexts,
  currentChangeIdx,
  goToPrevChange,
  goToNextChange,
  resetNavigation,
  registerScrollCallback,
  totalChanges,
} = useTextDiff()

const { scheduleAutoFormat, immediateFormat } = useAutoFormat()

const {
  highlightedSource,
  highlightedTarget,
  highlightSource,
  highlightTarget,
  highlightWithDiff,
  isSourceHighlighted,
  isTargetHighlighted,
} = useSyntaxHighlight()

const leftTextareaRef = ref<HTMLTextAreaElement | null>(null)
const rightTextareaRef = ref<HTMLTextAreaElement | null>(null)
const sourceHighlightRef = ref<HTMLElement | null>(null)
const targetHighlightRef = ref<HTMLElement | null>(null)
const diffBarRef = ref<HTMLElement | null>(null)

const diffBarItems = computed(() => {
  return diffLines.value.map(line => ({
    type: line.type,
    sourceText: line.type === 'delete' ? line.value : undefined,
    targetText: line.type === 'insert' ? line.value : undefined,
  }))
})

const setSourceHighlightRef = (el: HTMLElement | null) => {
  sourceHighlightRef.value = el
}

const setTargetHighlightRef = (el: HTMLElement | null) => {
  targetHighlightRef.value = el
}

// 使用从 useSyntaxHighlight 导出的语言选项
const langOptionsWithI18n = computed(() => {
  return langOptions.value.map(opt =>
    opt.value === "auto" ? { label: t("autoDetect"), value: opt.value } : opt
  )
})

const sourceLang = computed(() => {
  if (selectedLang.value !== "auto") return selectedLang.value;
  return detectLanguage(sourceText.value);
});

const targetLang = computed(() => {
  if (selectedLang.value !== "auto") return selectedLang.value;
  return detectLanguage(targetText.value);
});

const getLangLabel = (langValue: string) => {
  const opt = langOptions.value.find(
    (o) => o.value === langValue.toLowerCase(),
  );
  return opt ? opt.label : langValue.toUpperCase() || "Text";
};

const sourceLangLabel = computed(() => getLangLabel(sourceLang.value));
const targetLangLabel = computed(() => getLangLabel(targetLang.value));

// 带差异高亮的源代码（按行处理）
const diffHighlightedSource = computed(() => {
  if (!isSourceHighlighted.value) return ''
  const lines = sourceText.value.split('\n')
  return lines.map((line, idx) => {
    const diffLine = leftLines.value.find(l => l.idx === idx)
    const diffType = diffLine?.type
    return highlightWithDiff(line, sourceLang.value, diffType)
  }).join('\n')
})

// 带差异高亮的目标代码（按行处理）
const diffHighlightedTarget = computed(() => {
  if (!isTargetHighlighted.value) return ''
  const lines = targetText.value.split('\n')
  return lines.map((line, idx) => {
    const diffLine = rightLines.value.find(l => l.idx === idx)
    const diffType = diffLine?.type
    return highlightWithDiff(line, targetLang.value, diffType)
  }).join('\n')
})

const onLeftScroll = (e: Event) => {
  const target = e.target as HTMLTextAreaElement;
  if (sourceHighlightRef.value) {
    sourceHighlightRef.value.scrollTop = target.scrollTop
    sourceHighlightRef.value.scrollLeft = target.scrollLeft
  }
  const container = target.closest('.diff-scroll-container');
  if (container) {
    container.scrollTop = target.scrollTop;
  }
}

const onRightScroll = (e: Event) => {
  const target = e.target as HTMLTextAreaElement;
  if (targetHighlightRef.value) {
    targetHighlightRef.value.scrollTop = target.scrollTop
    targetHighlightRef.value.scrollLeft = target.scrollLeft
  }
  const container = target.closest('.diff-scroll-container');
  if (container) {
    container.scrollTop = target.scrollTop;
  }
}

const onLeftKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Tab') {
    e.preventDefault()
    const target = e.target as HTMLTextAreaElement
    const start = target.selectionStart
    const end = target.selectionEnd
    sourceText.value = sourceText.value.substring(0, start) + '  ' + sourceText.value.substring(end)
    requestAnimationFrame(() => {
      target.selectionStart = target.selectionEnd = start + 2
    })
  }
}

const onRightKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Tab') {
    e.preventDefault()
    const target = e.target as HTMLTextAreaElement
    const start = target.selectionStart
    const end = target.selectionEnd
    targetText.value = targetText.value.substring(0, start) + '  ' + targetText.value.substring(end)
    requestAnimationFrame(() => {
      target.selectionStart = target.selectionEnd = start + 2
    })
  }
}

watch([sourceText, sourceLang], ([text, lang]) => {
  highlightSource(text || '', lang)
})

watch([targetText, targetLang], ([text, lang]) => {
  highlightTarget(text || '', lang)
})

watch(sourceText, () => {
  scheduleAutoFormat(sourceText, selectedLang.value, "source")
})

watch(targetText, () => {
  scheduleAutoFormat(targetText, selectedLang.value, "target")
})

const handleScroll = (idx: number) => {
  const scrollTop = idx * 24
  leftTextareaRef.value?.scrollTo(0, scrollTop)
  rightTextareaRef.value?.scrollTo(0, scrollTop)
  if (sourceHighlightRef.value) sourceHighlightRef.value.scrollTop = scrollTop
  if (targetHighlightRef.value) targetHighlightRef.value.scrollTop = scrollTop
}

let unregisterLeft: (() => void) | undefined
let unregisterRight: (() => void) | undefined

onMounted(() => {
  unregisterLeft = registerScrollCallback((scrollTop) => {
    leftTextareaRef.value?.scrollTo(0, scrollTop)
  })
  unregisterRight = registerScrollCallback((scrollTop) => {
    rightTextareaRef.value?.scrollTo(0, scrollTop)
  })
})

onUnmounted(() => {
  unregisterLeft?.()
  unregisterRight?.()
})
</script>

<template>
  <div class="flex flex-col h-full gap-4">
    <!-- Toolbar -->
    <div
      class="h-14 border-b border-[var(--color-border)] bg-[var(--color-background)] flex items-center justify-between px-5 flex-shrink-0 z-30 shadow-sm relative w-full">
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2">
          <ZBadge variant="surface" size="lg">{{ t("language") }}</ZBadge>
          <ZSelect v-model="selectedLang" :options="langOptionsWithI18n" class="min-w-[120px]" />
        </div>

        <div class="h-4 w-px bg-[var(--color-border)] mx-1"></div>

        <div class="flex bg-[var(--color-surface)] rounded-md border border-[var(--color-border)] p-1 shadow-sm gap-1">
          <ZButton :variant="textViewMode === 'split' ? 'primary' : 'surface'" size="sm" @click="textViewMode = 'split'"
            class="!rounded-md">
            <ZIcon name="split" :size="14" />
            {{ t("textSplit") }}
          </ZButton>
          <ZButton :variant="textViewMode === 'unified' ? 'primary' : 'surface'" size="sm"
            @click="textViewMode = 'unified'" class="!rounded-md">
            <ZIcon name="unified" :size="14" />
            {{ t("textUnified") }}
          </ZButton>
        </div>
      </div>

      <div class="flex gap-4 items-center">
        <div v-if="isDiffing" class="flex items-center">
          <ZBadge variant="primary" dot pulse size="lg">
            {{ t("computing") || "Computing" }}
          </ZBadge>
        </div>
        <div class="flex gap-2">
          <ZBadge variant="success" size="lg">+{{ addedCount }}</ZBadge>
          <ZBadge variant="danger" size="lg">-{{ removedCount }}</ZBadge>
        </div>
        <div class="h-4 w-px bg-[var(--color-border)] mx-1"></div>
        <div class="flex items-center gap-1">
          <ZTooltip :content="t('prevChange') || 'Previous Change'" position="bottom">
            <ZButton variant="surface" size="sm" @click="goToPrevChange" :disabled="totalChanges === 0"
              class="!w-8 !h-8 !p-0">
              <ZIcon name="prev" :size="16" />
            </ZButton>
          </ZTooltip>
          <ZTooltip :content="t('nextChange') || 'Next Change'" position="bottom">
            <ZButton variant="surface" size="sm" @click="goToNextChange" :disabled="totalChanges === 0"
              class="!w-8 !h-8 !p-0">
              <ZIcon name="next" :size="16" />
            </ZButton>
          </ZTooltip>
          <span v-if="totalChanges > 0" class="text-xs text-[var(--color-secondary)] ml-1 font-mono min-w-[40px]">
            {{ currentChangeIdx >= 0 ? currentChangeIdx + 1 : 0 }}/{{ totalChanges }}
          </span>
        </div>
      </div>
    </div>

    <div class="flex-1 min-h-[400px] overflow-hidden diff-scroll-container">
      <!-- SPLIT MODE -->
      <div v-if="textViewMode === 'split'" class="grid grid-cols-[1fr_64px_1fr] gap-0 h-full">
        <!-- Source Panel -->
        <div
          class="flex flex-col h-full rounded-l-lg border-y border-l border-[var(--color-border)] overflow-hidden shadow-sm focus-within:ring-2 transition-all bg-[var(--color-background)]">
          <div
            class="bg-[var(--color-background)] px-3 py-2 border-b border-[var(--color-border)] flex justify-between items-center h-10">
            <div class="flex items-center gap-2">
              <ZBadge variant="surface" size="lg">
                <template #default>
                  <div class="flex items-center gap-1.5">
                    <ZIcon name="text" :size="12" class="opacity-70" />
                    {{ t("source") }}
                  </div>
                </template>
              </ZBadge>
            </div>
            <ZBadge variant="primary" dot pulse size="lg">
              {{ sourceLangLabel }}
            </ZBadge>
          </div>
          <div class="relative flex-1 group w-full h-full overflow-hidden">
            <!-- Line Numbers -->
            <div
              class="absolute left-0 top-0 bottom-0 w-10 bg-[var(--color-surface)] border-r border-[var(--color-border)] flex-shrink-0 flex flex-col font-mono text-[10px] text-[var(--color-secondary)] opacity-40 select-none text-right px-2 py-2 overflow-hidden">
              <div v-for="line in leftLines" :key="'ln-l-' + line.lineNum" class="h-6 leading-6">
                {{ line.lineNum }}
              </div>
            </div>
            <!-- Diff Highlights + Textarea -->
            <div class="absolute left-10 right-0 top-0 bottom-0">
              <!-- Highlight layer -->
              <pre v-if="isSourceHighlighted" :ref="setSourceHighlightRef"
                class="highlight-layer absolute inset-0 m-0 p-2 font-mono text-sm leading-6 whitespace-pre-wrap break-all pointer-events-none overflow-auto scrollbar-hide"
                v-html="diffHighlightedSource"></pre>
              <!-- Textarea -->
              <textarea ref="leftTextareaRef" v-model="sourceText" @scroll="onLeftScroll" @keydown="onLeftKeydown"
                class="diff-textarea absolute inset-0 m-0 w-full h-full p-2 font-mono text-sm leading-6 resize-none outline-none whitespace-pre-wrap border-none overflow-auto scrollbar-hide"
                wrap="soft" spellcheck="false" :placeholder="t('pasteSource')" style="word-break: normal"></textarea>
            </div>
          </div>
        </div>

        <!-- Center: Slim Diff Bar -->
        <DiffBar ref="diffBarRef" :title="t('textDiffShort') || t('diffResult')" :items="diffBarItems"
          :active-index="currentChangeIdx >= 0 ? changeIndices[currentChangeIdx] : -1" @item-click="handleScroll" />

        <!-- Target Panel -->
        <div
          class="flex flex-col h-full rounded-r-lg border-y border-r border-[var(--color-border)] overflow-hidden shadow-sm focus-within:ring-2 transition-all bg-[var(--color-background)]">
          <div
            class="bg-[var(--color-background)] px-3 py-2 border-b border-[var(--color-border)] flex justify-between items-center h-10">
            <div class="flex items-center gap-2">
              <ZBadge variant="surface" size="lg">
                <template #default>
                  <div class="flex items-center gap-1.5">
                    <ZIcon name="text" :size="12" class="opacity-70" />
                    {{ t("target") }}
                  </div>
                </template>
              </ZBadge>
            </div>
            <ZBadge variant="primary" dot pulse size="lg">
              {{ targetLangLabel }}
            </ZBadge>
          </div>
          <div class="relative flex-1 group w-full h-full overflow-hidden">
            <!-- Line Numbers -->
            <div
              class="absolute left-0 top-0 bottom-0 w-10 bg-[var(--color-surface)] border-r border-[var(--color-border)] flex-shrink-0 flex flex-col font-mono text-[10px] text-[var(--color-secondary)] opacity-40 select-none text-right px-2 py-2 overflow-hidden">
              <div v-for="line in rightLines" :key="'ln-r-' + line.lineNum" class="h-6 leading-6">
                {{ line.lineNum }}
              </div>
            </div>
            <!-- Diff Highlights + Textarea -->
            <div class="absolute left-10 right-0 top-0 bottom-0">
              <!-- Highlight layer -->
              <pre v-if="isTargetHighlighted" :ref="setTargetHighlightRef"
                class="highlight-layer absolute inset-0 m-0 p-2 font-mono text-sm leading-6 whitespace-pre-wrap break-all pointer-events-none overflow-auto scrollbar-hide"
                v-html="diffHighlightedTarget"></pre>
              <!-- Textarea -->
              <textarea ref="rightTextareaRef" v-model="targetText" @scroll="onRightScroll" @keydown="onRightKeydown"
                class="diff-textarea absolute inset-0 m-0 w-full h-full p-2 font-mono text-sm leading-6 resize-none outline-none whitespace-pre-wrap border-none overflow-auto scrollbar-hide"
                wrap="soft" spellcheck="false" :placeholder="t('pasteTarget')" style="word-break: normal"></textarea>
            </div>
          </div>
        </div>
      </div>

      <!-- UNIFIED MODE -->
      <div v-else
        class="h-full rounded-lg border border-[var(--color-border)] overflow-hidden shadow-sm bg-[var(--color-background)] flex flex-col">
        <div
          class="bg-[var(--color-background)] px-4 py-2 border-b border-[var(--color-border)] h-10 flex items-center">
          <ZBadge variant="surface" size="lg">{{ t("viewUnified") }}</ZBadge>
        </div>
        <div class="scrollbar-hide flex-1 overflow-auto bg-[var(--color-background)] custom-scrollbar">
          <div class="min-w-fit w-full font-mono text-sm leading-6 flex flex-col">
            <div v-for="(line, i) in unifiedDiffLines" :key="'u-' + i"
              class="flex group hover:bg-[var(--color-surface)] transition-colors">
              <div
                class="w-10 flex-shrink-0 text-right pr-2 text-[10px] text-[var(--color-secondary)] opacity-40 select-none bg-[var(--color-surface)] border-r border-[var(--color-border)]">
                {{ line.leftNo || "" }}
              </div>
              <div
                class="w-10 flex-shrink-0 text-right pr-2 text-[10px] text-[var(--color-secondary)] opacity-40 select-none bg-[var(--color-surface)] border-r border-[var(--color-border)]">
                {{ line.rightNo || "" }}
              </div>
              <div
                class="w-8 flex-shrink-0 text-center text-[var(--color-secondary)] opacity-50 select-none border-r border-[var(--color-border)] bg-[var(--color-surface)]">
                {{
                  line.type === "insert"
                    ? "+"
                    : line.type === "delete"
                      ? "-"
                      : " "
                }}
              </div>
              <div :class="[
                'flex-1 px-4 whitespace-pre',
                line.type === 'insert'
                  ? 'bg-[var(--color-insert-bg)] text-[var(--color-insert-text)]'
                  : '',
                line.type === 'delete'
                  ? 'bg-[var(--color-delete-bg)] text-[var(--color-delete-text)]'
                  : '',
              ]">
                {{ line.value }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.diff-textarea {
  color: transparent !important;
  background: transparent !important;
  -webkit-text-fill-color: transparent;
  caret-color: var(--color-text);
}

.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
}

.highlight-layer {
  :deep(.hljs) {
    background: transparent;
    padding: 0;
    margin: 0;
    color: var(--color-text);
  }

  :deep(.hljs-keyword),
  :deep(.hljs-selector-tag),
  :deep(.hljs-title),
  :deep(.hljs-section),
  :deep(.hljs-doctag),
  :deep(.hljs-name),
  :deep(.hljs-strong),
  :deep(.hljs-built_in),
  :deep(.hljs-operator) {
    color: #c678dd;
  }

  :deep(.hljs-string),
  :deep(.hljs-title.class_),
  :deep(.hljs-title.class_.inherited__),
  :deep(.hljs-title.function_),
  :deep(.hljs-addition) {
    color: #98c379;
  }

  :deep(.hljs-comment),
  :deep(.hljs-quote) {
    color: #5c6370;
    font-style: italic;
  }

  :deep(.hljs-number),
  :deep(.hljs-literal),
  :deep(.hljs-variable),
  :deep(.hljs-template-variable),
  :deep(.hljs-tag .hljs-attr),
  :deep(.hljs-attr) {
    color: #d19a66;
  }

  :deep(.hljs-type),
  :deep(.hljs-class .hljs-title) {
    color: #61afef;
  }

  :deep(.hljs-deletion) {
    color: #e06c75;
    background-color: rgba(224, 108, 117, 0.15);
  }

  :deep(.hljs-function),
  :deep(.hljs-title.function_) {
    color: #61afef;
  }

  :deep(.hljs-params) {
    color: #e06c75;
  }

  :deep(.hljs-meta) {
    color: #e5c07b;
  }

  :deep(.hljs-attribute) {
    color: #98c379;
  }

  :deep(.hljs-symbol),
  :deep(.hljs-bullet) {
    color: #e5c07b;
  }

  :deep(.hljs-link) {
    color: #61afef;
    text-decoration: underline;
  }
}

:deep(.diff-line-delete) {
  background-color: rgba(224, 108, 117, 0.2);
  display: inline-block;
  width: 100%;
}

:deep(.diff-line-insert) {
  background-color: rgba(152, 195, 121, 0.2);
  display: inline-block;
  width: 100%;
}
</style>