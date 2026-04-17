<script lang="ts" setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'

const min = ref(1)
const max = ref(100)
const count = ref(1)
const decimalPlaces = ref(0)
const results = ref<number[]>([])

function generate() {
  const res: number[] = []
  for (let i = 0; i < Math.min(count.value, 100); i++) {
    const val = Math.random() * (max.value - min.value) + min.value
    res.push(decimalPlaces.value > 0 ? parseFloat(val.toFixed(decimalPlaces.value)) : Math.floor(val))
  }
  results.value = res
}

function copyText(text: string) {
  if ((window as any).ztools?.copyText) {
    (window as any).ztools.copyText(text)
  } else {
    navigator.clipboard.writeText(text)
  }
  ElMessage.success({ message: '已复制到剪贴板', duration: 800 })
}
</script>

<template>
  <div class="random-number">
    <div class="config">
      <div class="config-row">
        <span>最小值</span>
        <el-input-number v-model="min" size="small" />
        <span>最大值</span>
        <el-input-number v-model="max" size="small" />
      </div>
      <div class="config-row">
        <span>生成个数</span>
        <el-input-number v-model="count" :min="1" :max="100" size="small" />
        <span>小数位数</span>
        <el-input-number v-model="decimalPlaces" :min="0" :max="10" size="small" />
      </div>
    </div>

    <div class="actions">
      <el-button type="primary" @click="generate">生成</el-button>
      <el-button v-if="results.length" size="small" @click="copyText(results.join('\n'))">复制全部</el-button>
    </div>

    <div v-if="results.length" class="result-grid">
      <div
        v-for="(num, idx) in results"
        :key="idx"
        class="result-item"
        @click="copyText(String(num))"
      >
        {{ num }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.random-number {
  padding: 12px;
  max-width: 500px;
  margin: 0 auto;
  font-size: 13px;
}

.config {
  margin-bottom: 16px;
}

.config-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.config-row span {
  color: var(--text-secondary, #888);
  flex-shrink: 0;
}

.actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.result-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 8px;
}

.result-item {
  padding: 10px;
  text-align: center;
  background: var(--bg-card, #fff);
  border: 1px solid var(--border-color, #e5e5e5);
  border-radius: 6px;
  cursor: pointer;
  font-family: 'Consolas', monospace;
  font-size: 16px;
  color: var(--text-primary, #333);
  transition: background 0.15s;
}

.result-item:hover {
  background: var(--bg-hover, #f5f7ff);
  border-color: #667eea;
}

@media (prefers-color-scheme: dark) {
  .result-item {
    background: #2c2c2c;
    border-color: #444;
    color: #ddd;
  }

  .result-item:hover {
    background: #363640;
    border-color: #667eea;
  }
}
</style>
