import { DiffChunk, DiffResult, IDiffStrategy } from '../types'

export class TextDiffStrategy implements IDiffStrategy<string> {
  type = 'text' as const

  compute(source: string, target: string): DiffResult {
    const sourceLines = source === '' ? [] : source.split(/\r?\n/)
    const targetLines = target === '' ? [] : target.split(/\r?\n/)

    const chunks = this.myersDiff(sourceLines, targetLines)
    return {
      type: 'text',
      chunks,
      sourceLineCount: sourceLines.length,
      targetLineCount: targetLines.length
    }
  }

  /**
   * Basic Myers shortest edit script (SES) algorithm
   * O(ND) time and space
   */
  private myersDiff(a: string[], b: string[]): DiffChunk[] {
    const n = a.length
    const m = b.length
    const max = n + m
    if (max === 0) return []

    const v: Record<number, number> = {}
    v[1] = 0
    
    // Store history of V to backtrack the actual path
    const trace: Record<number, number>[] = []

    for (let d = 0; d <= max; d++) {
      const vCopy = { ...v }
      trace.push(vCopy)

      for (let k = -d; k <= d; k += 2) {
        let x: number
        const down = (k === -d || (k !== d && v[k - 1] < v[k + 1]))
        if (down) {
          // move down (insertion)
          x = v[k + 1]
        } else {
          // move right (deletion)
          x = v[k - 1] + 1
        }
        let y = x - k

        // Follow diagonals (equal elements)
        while (x < n && y < m && a[x] === b[y]) {
          x++
          y++
        }
        v[k] = x

        // Reached the end?
        if (x >= n && y >= m) {
          return this.backtrack(trace, a, b)
        }
      }
    }
    return []
  }

  /**
   * Backtrack through the trace to build the sequence of edits
   */
  private backtrack(trace: Record<number, number>[], a: string[], b: string[]): DiffChunk[] {
    const result: DiffChunk[] = []
    let x = a.length
    let y = b.length

    for (let d = trace.length - 1; d >= 0; d--) {
      const v = trace[d]
      const k = x - y
      let prevK: number

      if (k === -d || (k !== d && v[k - 1] < v[k + 1])) {
        prevK = k + 1
      } else {
        prevK = k - 1
      }

      const prevX = v[prevK]
      const prevY = prevX - prevK

      // While on a diagonal
      while (x > prevX && y > prevY) {
        result.push({ type: 'equal', value: a[x - 1] })
        x--
        y--
      }

      if (d > 0) {
        // Did we move vertically or horizontally?
        if (x === prevX) {
          // Insertion
          result.push({ type: 'insert', value: b[y - 1] })
          y--
        } else {
          // Deletion
          result.push({ type: 'delete', value: a[x - 1] })
          x--
        }
      }
    }

    // Results are built backwards, so reverse them
    return result.reverse()
  }
}
