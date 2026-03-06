export type DiffType = 'text' | 'image' | 'word'

export interface DiffChunk {
  type: 'equal' | 'insert' | 'delete'
  value: string
  // For UI rendering, we might need a unique ID or line number references.
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
