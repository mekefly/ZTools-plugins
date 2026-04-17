import { type Component } from 'vue'
import Identity from '../tools/Identity/index.vue'
import RandomPassword from '../tools/RandomPassword/index.vue'
import RandomNumber from '../tools/RandomNumber/index.vue'
import UUID from '../tools/UUID/index.vue'
import RandomColor from '../tools/RandomColor/index.vue'
import Signature from '../tools/Signature/index.vue'

export interface Tool {
  code: string
  name: string
  icon: string
  component: Component
}

export interface Category {
  name: string
  code: string
  tools: Tool[]
}

export const categories: Category[] = [
  {
    name: '随机/生成',
    code: 'random',
    tools: [
      { code: 'identity', name: '随机身份', icon: '', component: Identity },
      { code: 'password', name: '随机密码', icon: '', component: RandomPassword },
      { code: 'number', name: '随机数字', icon: '', component: RandomNumber },
      { code: 'uuid', name: 'UUID生成', icon: '', component: UUID },
      { code: 'color', name: '随机颜色', icon: '', component: RandomColor },
    ]
  },
  {
    name: '加密/安全',
    code: 'crypto',
    tools: [
      { code: 'signature', name: '加密签名', icon: '', component: Signature },
    ]
  }
]

// code -> tool 映射，用于快速查找
export const toolMap = new Map<string, Tool>()
for (const cat of categories) {
  for (const tool of cat.tools) {
    toolMap.set(tool.code, tool)
  }
}
