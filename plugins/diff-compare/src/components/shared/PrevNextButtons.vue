<script setup lang="ts">
import ZTooltip from '@/components/ui/base/ZTooltip.vue'
import ZButton from '@/components/ui/base/ZButton.vue'

defineProps<{
    prevLabel?: string
    nextLabel?: string
}>()

defineEmits<{
    prev: []
    next: []
}>()
</script>

<template>
    <ZTooltip :content="prevLabel" position="bottom">
        <ZButton variant="ghost" size="icon-sm" @click="$emit('prev')" class="!w-6 !h-6">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2.5">
                <path d="m18 15-6-6-6 6" />
            </svg>
        </ZButton>
    </ZTooltip>
    <ZTooltip :content="nextLabel" position="bottom">
        <ZButton variant="ghost" size="icon-sm" @click="$emit('next')" class="!w-6 !h-6">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2.5">
                <path d="m6 9 6 6 6-6" />
            </svg>
        </ZButton>
    </ZTooltip>
</template>
