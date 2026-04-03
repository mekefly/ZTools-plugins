<script lang="ts" setup>
import { ref, computed } from 'vue'

const props = defineProps({
  launchParam: {
    type: Object,
    required: true,
  },
})

// 格式化日期为 YYYY-MM-DD HH:mm:ss
const formatDateTime = (date: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

const inputValue = ref(props.launchParam.payload || new Date().getTime().toString())

// 复制到剪贴板
const copyToClipboard = async (text: string) => {
  if (text === '-') return
  try {
    ztools.copyText(text)
  } catch (err) {
    console.error('复制失败:', err)
  }
}

// 解析输入为 Date 对象
const parsedDate = computed(() => {
  if (!inputValue.value) return null
  const trimmed = inputValue.value.trim()
  // 如果是纯数字，视为毫秒时间戳
  if (/^\d+$/.test(trimmed)) {
    const num = Number(trimmed)
    return new Date(num < 1e12 ? num * 1000 : num)
  }
  // 尝试解析为日期字符串
  const date = new Date(trimmed)
  return isNaN(date.getTime()) ? null : date
})

// 格式化本地时间
const localTimeFull = computed(() => {
  if (!parsedDate.value) return '-'
  return formatDateTime(parsedDate.value)
})

// 格式化本地日期
const localTimeDate = computed(() => {
  if (!parsedDate.value) return '-'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${parsedDate.value.getFullYear()}-${pad(parsedDate.value.getMonth() + 1)}-${pad(parsedDate.value.getDate())}`
})

// 时间戳(秒)
const timestampSeconds = computed(() => {
  if (!parsedDate.value) return '-'
  return String(Math.floor(parsedDate.value.getTime() / 1000))
})

// 时间戳(毫秒)
const timestampMilliseconds = computed(() => {
  if (!parsedDate.value) return '-'
  return String(parsedDate.value.getTime())
})

// UTC 时间
const utcTime = computed(() => {
  if (!parsedDate.value) return '-'
  return parsedDate.value.toISOString().replace('T', ' ').substring(0, 19)
})
</script>

<template>
  <div class="bg-gray-50">
    <div class="bg-white">
      <!-- Header -->
      <div class="p-4 border-b bg-gray-50">
        <input
          type="text"
          class="w-full px-3 py-2 text-xl font-medium text-gray-800 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="请输入时间戳或时间..."
          v-model="inputValue"
        />
      </div>

      <!-- Time conversion results -->
      <div class="divide-y">
        <!-- Local time with dynamic timezone -->
        <div class="flex items-center justify-between p-4 hover:bg-gray-50">
          <div class="flex-1">
            <span class="text-gray-600 text-sm">本地时间</span>
            <div class="text-lg font-mono text-gray-900">{{ localTimeFull }}</div>
          </div>
          <button
            class="copy-btn px-3 py-1 text-xs border border-gray-300 rounded hover:bg-blue-500 hover:text-white transition-colors cursor-pointer"
            :data-copy="localTimeFull"
            @click="copyToClipboard(localTimeFull)"
          >
            复制
          </button>
        </div>

        <!-- Local time date with dynamic timezone -->
        <div class="flex items-center justify-between p-4 hover:bg-gray-50">
          <div class="flex-1">
            <span class="text-gray-600 text-sm">本地时间, 日期</span>
            <div class="text-lg font-mono text-gray-900">{{ localTimeDate }}</div>
          </div>
          <button
            class="copy-btn px-3 py-1 text-xs border border-gray-300 rounded hover:bg-blue-500 hover:text-white transition-colors cursor-pointer"
            :data-copy="localTimeDate"
            @click="copyToClipboard(localTimeDate)"
          >
            复制
          </button>
        </div>

        <!-- 时间戳(秒) -->
        <div class="flex items-center justify-between p-4 hover:bg-gray-50">
          <div class="flex-1">
            <span class="text-gray-600 text-sm">时间戳(秒)</span>
            <div class="text-lg font-mono text-gray-900">{{ timestampSeconds }}</div>
          </div>
          <button
            class="copy-btn px-3 py-1 text-xs border border-gray-300 rounded hover:bg-blue-500 hover:text-white transition-colors cursor-pointer"
            :data-copy="timestampSeconds"
            @click="copyToClipboard(timestampSeconds)"
          >
            复制
          </button>
        </div>

        <!-- 时间戳(毫秒) -->
        <div class="flex items-center justify-between p-4 hover:bg-gray-50">
          <div class="flex-1">
            <span class="text-gray-600 text-sm">时间戳(毫秒)</span>
            <div class="text-lg font-mono text-gray-900">{{ timestampMilliseconds }}</div>
          </div>
          <button
            class="copy-btn px-3 py-1 text-xs border border-gray-300 rounded hover:bg-blue-500 hover:text-white transition-colors cursor-pointer"
            :data-copy="timestampMilliseconds"
            @click="copyToClipboard(timestampMilliseconds)"
          >
            复制
          </button>
        </div>

        <!-- 标准时间(UTC) -->
        <div class="flex items-center justify-between p-4 hover:bg-gray-50">
          <div class="flex-1">
            <span class="text-gray-600 text-sm">标准时间(UTC)</span>
            <div class="text-lg font-mono text-gray-900">{{ utcTime }}</div>
          </div>
          <button
            class="copy-btn px-3 py-1 text-xs border border-gray-300 rounded hover:bg-blue-500 hover:text-white transition-colors cursor-pointer"
            :data-copy="utcTime"
            @click="copyToClipboard(utcTime)"
          >
            复制
          </button>
        </div>
      </div>

      <!-- Footer -->
      <div class="p-4 border-t bg-gray-50 text-right">
        <button
          class="inline-flex items-center text-sm text-gray-600 hover:text-gray-800 cursor-pointer"
        >
          <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c-.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            ></path>
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            ></path>
          </svg>
          其它时区
        </button>
      </div>

      <!-- 其它时区 -->
      <div class="hidden border-t">
        <div class="flex items-center justify-between p-4 hover:bg-gray-50 border-b">
          <div class="flex-1">
            <span class="text-gray-600 text-sm">UTC-12:00 贝克岛时间(BIT)</span>
            <div class="text-lg font-mono text-gray-900 timezone-time" data-offset="-720">-</div>
          </div>
        </div>
        <div class="flex items-center justify-between p-4 hover:bg-gray-50 border-b">
          <div class="flex-1">
            <span class="text-gray-600 text-sm">UTC-11:00 萨摩亚标准时间(SST)、纽埃时间(NUT)</span>
            <div class="text-lg font-mono text-gray-900 timezone-time" data-offset="-660">-</div>
          </div>
        </div>
        <div class="flex items-center justify-between p-4 hover:bg-gray-50 border-b">
          <div class="flex-1">
            <span class="text-gray-600 text-sm">UTC-10:00 夏威夷-阿留申标准时间(HST)、塔希提时间(TAHT)</span>
            <div class="text-lg font-mono text-gray-900 timezone-time" data-offset="-600">-</div>
          </div>
        </div>
        <div class="flex items-center justify-between p-4 hover:bg-gray-50 border-b">
          <div class="flex-1">
            <span class="text-gray-600 text-sm">UTC-9:30 马克萨斯群岛时间(MART)</span>
            <div class="text-lg font-mono text-gray-900 timezone-time" data-offset="-570">-</div>
          </div>
        </div>
        <div class="flex items-center justify-between p-4 hover:bg-gray-50 border-b">
          <div class="flex-1">
            <span class="text-gray-600 text-sm">UTC-9:00 阿拉斯加标准时间(AKST)、甘比尔群岛时间(GIT)</span>
            <div class="text-lg font-mono text-gray-900 timezone-time" data-offset="-540">-</div>
          </div>
        </div>
        <div class="flex items-center justify-between p-4 hover:bg-gray-50 border-b">
          <div class="flex-1">
            <span class="text-gray-600 text-sm">UTC-8:00 太平洋标准时间(PST)</span>
            <div class="text-lg font-mono text-gray-900 timezone-time" data-offset="-480">-</div>
          </div>
        </div>
        <div class="flex items-center justify-between p-4 hover:bg-gray-50 border-b">
          <div class="flex-1">
            <span class="text-gray-600 text-sm">UTC-7:00 山地标准时间(MST)</span>
            <div class="text-lg font-mono text-gray-900 timezone-time" data-offset="-420">-</div>
          </div>
        </div>
        <div class="flex items-center justify-between p-4 hover:bg-gray-50 border-b">
          <div class="flex-1">
            <span class="text-gray-600 text-sm">UTC-6:00 北美中部标准时间(CST)</span>
            <div class="text-lg font-mono text-gray-900 timezone-time" data-offset="-360">-</div>
          </div>
        </div>
        <div class="flex items-center justify-between p-4 hover:bg-gray-50 border-b">
          <div class="flex-1">
            <span class="text-gray-600 text-sm">UTC-5:00 北美东部标准时间(EST)</span>
            <div class="text-lg font-mono text-gray-900 timezone-time" data-offset="-300">-</div>
          </div>
        </div>
        <div class="flex items-center justify-between p-4 hover:bg-gray-50 border-b">
          <div class="flex-1">
            <span class="text-gray-600 text-sm">UTC-4:00 大西洋标准时间(AST)</span>
            <div class="text-lg font-mono text-gray-900 timezone-time" data-offset="-240">-</div>
          </div>
        </div>
        <div class="flex items-center justify-between p-4 hover:bg-gray-50 border-b">
          <div class="flex-1">
            <span class="text-gray-600 text-sm">UTC-3:30 纽芬兰标准时间(NST)</span>
            <div class="text-lg font-mono text-gray-900 timezone-time" data-offset="-210">-</div>
          </div>
        </div>
        <div class="flex items-center justify-between p-4 hover:bg-gray-50 border-b">
          <div class="flex-1">
            <span class="text-gray-600 text-sm">UTC-3:00 阿根廷时间(ART)、巴西利亚时间(BRT)</span>
            <div class="text-lg font-mono text-gray-900 timezone-time" data-offset="-180">-</div>
          </div>
        </div>
        <div class="flex items-center justify-between p-4 hover:bg-gray-50 border-b">
          <div class="flex-1">
            <span class="text-gray-600 text-sm">UTC-2:00 南乔治亚时间(GST)</span>
            <div class="text-lg font-mono text-gray-900 timezone-time" data-offset="-120">-</div>
          </div>
        </div>
        <div class="flex items-center justify-between p-4 hover:bg-gray-50 border-b">
          <div class="flex-1">
            <span class="text-gray-600 text-sm">UTC-1:00 亚速尔时间(AZOT)、佛得角时间(CVT)</span>
            <div class="text-lg font-mono text-gray-900 timezone-time" data-offset="-60">-</div>
          </div>
        </div>
        <div class="flex items-center justify-between p-4 hover:bg-gray-50 border-b">
          <div class="flex-1">
            <span class="text-gray-600 text-sm">UTC±0:00 格林威治标准时间(GMT)、世界标准时间(WET)、祖鲁时间(Z)</span>
            <div class="text-lg font-mono text-gray-900 timezone-time" data-offset="0">-</div>
          </div>
        </div>
        <div class="flex items-center justify-between p-4 hover:bg-gray-50 border-b">
          <div class="flex-1">
            <span class="text-gray-600 text-sm">UTC+1:00 欧洲中部时间(CET)、西非时间(WAT)</span>
            <div class="text-lg font-mono text-gray-900 timezone-time" data-offset="60">-</div>
          </div>
        </div>
        <div class="flex items-center justify-between p-4 hover:bg-gray-50 border-b">
          <div class="flex-1">
            <span class="text-gray-600 text-sm"
              >UTC+2:00 欧洲东部时间(EET)、中部非洲时间(CAT)、以色列标准时间(IST)</span
            >
            <div class="text-lg font-mono text-gray-900 timezone-time" data-offset="120">-</div>
          </div>
        </div>
        <div class="flex items-center justify-between p-4 hover:bg-gray-50 border-b">
          <div class="flex-1">
            <span class="text-gray-600 text-sm">UTC+3:00 莫斯科时间(MSK)、东非时间(EAT)、阿拉伯标准时间(AST)</span>
            <div class="text-lg font-mono text-gray-900 timezone-time" data-offset="180">-</div>
          </div>
        </div>
        <div class="flex items-center justify-between p-4 hover:bg-gray-50 border-b">
          <div class="flex-1">
            <span class="text-gray-600 text-sm">UTC+3:30 伊朗标准时间(IRST)</span>
            <div class="text-lg font-mono text-gray-900 timezone-time" data-offset="210">-</div>
          </div>
        </div>
        <div class="flex items-center justify-between p-4 hover:bg-gray-50 border-b">
          <div class="flex-1">
            <span class="text-gray-600 text-sm">UTC+4:00 海湾标准时间(GST)、萨马拉时间(SAMT)</span>
            <div class="text-lg font-mono text-gray-900 timezone-time" data-offset="240">-</div>
          </div>
        </div>
        <div class="flex items-center justify-between p-4 hover:bg-gray-50 border-b">
          <div class="flex-1">
            <span class="text-gray-600 text-sm">UTC+4:30 阿富汗时间(AFT)</span>
            <div class="text-lg font-mono text-gray-900 timezone-time" data-offset="270">-</div>
          </div>
        </div>
        <div class="flex items-center justify-between p-4 hover:bg-gray-50 border-b">
          <div class="flex-1">
            <span class="text-gray-600 text-sm">UTC+5:00 巴基斯坦标准时间(PKT)、叶卡捷琳堡时间(YEKT)</span>
            <div class="text-lg font-mono text-gray-900 timezone-time" data-offset="300">-</div>
          </div>
        </div>
        <div class="flex items-center justify-between p-4 hover:bg-gray-50 border-b">
          <div class="flex-1">
            <span class="text-gray-600 text-sm">UTC+5:30 印度标准时间(IST)</span>
            <div class="text-lg font-mono text-gray-900 timezone-time" data-offset="330">-</div>
          </div>
        </div>
        <div class="flex items-center justify-between p-4 hover:bg-gray-50 border-b">
          <div class="flex-1">
            <span class="text-gray-600 text-sm">UTC+5:45 尼泊尔时间(NPT)</span>
            <div class="text-lg font-mono text-gray-900 timezone-time" data-offset="345">-</div>
          </div>
        </div>
        <div class="flex items-center justify-between p-4 hover:bg-gray-50 border-b">
          <div class="flex-1">
            <span class="text-gray-600 text-sm">UTC+6:00 孟加拉时间(BDT)、不丹时间(BTT)、鄂木斯克时间(OMST)</span>
            <div class="text-lg font-mono text-gray-900 timezone-time" data-offset="360">-</div>
          </div>
        </div>
        <div class="flex items-center justify-between p-4 hover:bg-gray-50 border-b">
          <div class="flex-1">
            <span class="text-gray-600 text-sm">UTC+6:30 缅甸时间(MMT)、科科斯群岛时间(CCT)</span>
            <div class="text-lg font-mono text-gray-900 timezone-time" data-offset="390">-</div>
          </div>
        </div>
        <div class="flex items-center justify-between p-4 hover:bg-gray-50 border-b">
          <div class="flex-1">
            <span class="text-gray-600 text-sm">UTC+7:00 中南半岛时间(ICT)、克拉斯诺亚尔斯克时间(KRAT)</span>
            <div class="text-lg font-mono text-gray-900 timezone-time" data-offset="420">-</div>
          </div>
        </div>
        <div class="flex items-center justify-between p-4 hover:bg-gray-50 border-b">
          <div class="flex-1">
            <span class="text-gray-600 text-sm"
              >UTC+8:00
              中国标准时间(CST)、新加坡时间(SGT)、澳大利亚西部标准时间(AWST)、香港时间(HKT)、菲律宾时间(PHT)</span
            >
            <div class="text-lg font-mono text-gray-900 timezone-time" data-offset="480">-</div>
          </div>
        </div>
        <div class="flex items-center justify-between p-4 hover:bg-gray-50 border-b">
          <div class="flex-1">
            <span class="text-gray-600 text-sm">UTC+8:45 澳大利亚中西部标准时间(ACWST)</span>
            <div class="text-lg font-mono text-gray-900 timezone-time" data-offset="525">-</div>
          </div>
        </div>
        <div class="flex items-center justify-between p-4 hover:bg-gray-50 border-b">
          <div class="flex-1">
            <span class="text-gray-600 text-sm">UTC+9:00 日本标准时间(JST)、韩国标准时间(KST)、雅库茨克时间(YAKT)</span>
            <div class="text-lg font-mono text-gray-900 timezone-time" data-offset="540">-</div>
          </div>
        </div>
        <div class="flex items-center justify-between p-4 hover:bg-gray-50 border-b">
          <div class="flex-1">
            <span class="text-gray-600 text-sm">UTC+9:30 澳大利亚中部标准时间(ACST)</span>
            <div class="text-lg font-mono text-gray-900 timezone-time" data-offset="570">-</div>
          </div>
        </div>
        <div class="flex items-center justify-between p-4 hover:bg-gray-50 border-b">
          <div class="flex-1">
            <span class="text-gray-600 text-sm"
              >UTC+10:00 澳大利亚东部标准时间(AEST)、符拉迪沃斯托克（海参崴）时间(VLAT)</span
            >
            <div class="text-lg font-mono text-gray-900 timezone-time" data-offset="600">-</div>
          </div>
        </div>
        <div class="flex items-center justify-between p-4 hover:bg-gray-50 border-b">
          <div class="flex-1">
            <span class="text-gray-600 text-sm">UTC+10:30 豪勋爵岛标准时间(LHST)</span>
            <div class="text-lg font-mono text-gray-900 timezone-time" data-offset="630">-</div>
          </div>
        </div>
        <div class="flex items-center justify-between p-4 hover:bg-gray-50 border-b">
          <div class="flex-1">
            <span class="text-gray-600 text-sm">UTC+11:00 所罗门群岛时间(SBT)、马加丹时间(MAGT)</span>
            <div class="text-lg font-mono text-gray-900 timezone-time" data-offset="660">-</div>
          </div>
        </div>
        <div class="flex items-center justify-between p-4 hover:bg-gray-50 border-b">
          <div class="flex-1">
            <span class="text-gray-600 text-sm">UTC+12:00 新西兰标准时间(NZST)、斐济时间(FJT)、堪察加时间(PETT)</span>
            <div class="text-lg font-mono text-gray-900 timezone-time" data-offset="720">-</div>
          </div>
        </div>
        <div class="flex items-center justify-between p-4 hover:bg-gray-50 border-b">
          <div class="flex-1">
            <span class="text-gray-600 text-sm">UTC+12:45 查塔姆标准时间(CHAST)</span>
            <div class="text-lg font-mono text-gray-900 timezone-time" data-offset="765">-</div>
          </div>
        </div>
        <div class="flex items-center justify-between p-4 hover:bg-gray-50 border-b">
          <div class="flex-1">
            <span class="text-gray-600 text-sm">UTC+13:00 汤加时间(TOT)、菲尼克斯群岛时间(PHOT)</span>
            <div class="text-lg font-mono text-gray-900 timezone-time" data-offset="780">-</div>
          </div>
        </div>
        <div class="flex items-center justify-between p-4 hover:bg-gray-50 border-b">
          <div class="flex-1">
            <span class="text-gray-600 text-sm">UTC+14:00 莱恩群岛时间(LINT)</span>
            <div class="text-lg font-mono text-gray-900 timezone-time" data-offset="840">-</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
