// Before/after pairs of single media slots (no Vue): the slots a template's swap action joins,
// and which of two files goes where.
import type { UiSlotAction } from '@vgen/shared';
import { compareFileNames, fileStem } from './file-names';

/** The two slots of the swap action holding `slotKey` (e.g. before / after), else null. */
export const pairOf = (
  actions: readonly UiSlotAction[] | undefined,
  slotKey: string,
): readonly [string, string] | null =>
  // Swap is the only slot action: the slots it joins are a pair.
  actions?.find((action) => action.slots.includes(slotKey))?.slots ?? null;

/** Words in a file name that mark the original / the edit (`IMG_5471_Original`, `shot-after`). */
const ORIGINAL_WORDS = new Set(['original', 'orig', 'raw', 'before', 'unedited', 'source', 'src']);
const EDITED_WORDS = new Set(['edited', 'edit', 'after', 'final']);

/** 0: marked as the original, 2: marked as the edit, 1: no mark. */
const markOf = (name: string): number => {
  const words = fileStem(name)
    .toLowerCase()
    .split(/[^a-z]+/);
  if (words.some((word) => ORIGINAL_WORDS.has(word))) return 0;
  return words.some((word) => EDITED_WORDS.has(word)) ? 2 : 1;
};

/**
 * Files with the original first, so the first one is "before": a name marked as the original
 * (`_Original`, `raw`, `before`) before one marked as the edit (`_Edited`, `after`), else natural
 * name order (`IMG_1234.jpg` before its export `IMG_1234-2.jpg`).
 */
export const orderByName = <T>(items: readonly T[], nameOf: (item: T) => string): T[] =>
  [...items].sort((a, b) => markOf(nameOf(a)) - markOf(nameOf(b)) || compareFileNames(nameOf(a), nameOf(b)));
