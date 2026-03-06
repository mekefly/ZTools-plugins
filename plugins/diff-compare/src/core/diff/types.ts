export type DiffType = 'text' | 'image' | 'word'

export interface DiffChunk {
  type: 'equal' | 'insert' | 'delete' | 'modified'
  value: string
  value2?: string // For modified lines, stores the target value
  // For modified lines, we may have sub-chunks (character-level diff)
  subChunks?: DiffChunk[]
}

export interface DiffResult {
  type: DiffType
  chunks: DiffChunk[]
  sourceLineCount?: number
  targetLineCount?: number
}

export interface IDiffStrategy<InputType = any> {
  type: DiffType
  compute(source: InputType, target: InputType): DiffResult
}
