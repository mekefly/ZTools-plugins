import { diffArrays, diffWordsWithSpace, Change } from 'diff';
import { DiffResult, IDiffStrategy } from '../types';

export interface TextDiffResult extends DiffResult<string> {
  sourceLine?: number
  targetLine?: number
  inlineChanges?: Change[]
}

export class TextDiffStrategy implements IDiffStrategy<string> {
  type = 'text' as const;

  diff(source: string[], target: string[]): TextDiffResult[] {
    const changes = diffArrays(source, target);
    const result: TextDiffResult[] = [];

    let sourceIndex = 1;
    let targetIndex = 1;

    for (let k = 0; k < changes.length; k++) {
      const part = changes[k];

      if (part.removed && changes[k + 1] && changes[k + 1].added) {
        const removedPart = part;
        const addedPart = changes[k + 1];

        const maxLength = Math.max(removedPart.value.length, addedPart.value.length);

        for (let idx = 0; idx < maxLength; idx++) {
          const sLine = removedPart.value[idx];
          const tLine = addedPart.value[idx];

          if (sLine !== undefined && tLine !== undefined) {
            const inlineChanges = diffWordsWithSpace(sLine, tLine);
            result.push({
              type: 'modify',
              source: sLine,
              target: tLine,
              sourceLine: sourceIndex++,
              targetLine: targetIndex++,
              inlineChanges
            });
          } else if (sLine !== undefined) {
            result.push({ type: 'delete', source: sLine, sourceLine: sourceIndex++ });
          } else if (tLine !== undefined) {
            result.push({ type: 'insert', target: tLine, targetLine: targetIndex++ });
          }
        }
        k++;
        continue;
      }

      if (!part.added && !part.removed) {
        for (const value of part.value) {
          result.push({
            type: 'equal',
            source: value,
            target: value,
            sourceLine: sourceIndex++,
            targetLine: targetIndex++
          });
        }
      } else if (part.removed) {
        for (const value of part.value) {
          result.push({
            type: 'delete',
            source: value,
            sourceLine: sourceIndex++
          });
        }
      } else if (part.added) {
        for (const value of part.value) {
          result.push({
            type: 'insert',
            target: value,
            targetLine: targetIndex++
          });
        }
      }
    }

    return result;
  }
}