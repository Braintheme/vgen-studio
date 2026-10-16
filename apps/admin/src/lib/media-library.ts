// Pure helpers of the media library (no Vue): DTOs -> tiles, the selection's totals.
import type { MediaLibraryItemDto } from '@vgen/shared';
import { formatBytes, formatDuration, formatRelativeTime } from './format';
import type { MediaTileView } from './ui-types';

/** Library items as tiles, with their draft usage and selection. */
export const toMediaTiles = (
  items: readonly MediaLibraryItemDto[],
  draftUsage: ReadonlyMap<string, readonly string[]>,
  selected: ReadonlySet<string>,
  now: Date = new Date(),
): MediaTileView[] =>
  items.map((item) => ({
    id: item.id,
    kind: item.kind,
    name: item.originalName,
    previewUrl: item.previewUrl,
    sizeLabel: formatBytes(item.size),
    dateLabel: formatRelativeTime(item.createdAt, now),
    durationLabel:
      item.kind === 'video' && item.durationSec !== null ? formatDuration(item.durationSec) : null,
    renderCount: item.renderCount,
    draftTemplates: draftUsage.get(item.id) ?? [],
    selected: selected.has(item.id),
  }));

/** What deleting the selected files means: how many, how big, and what still uses them. */
export interface SelectionSummary {
  readonly count: number;
  readonly bytes: number;
  /** Files some render uses (re-rendering those renders will fail). */
  readonly inRenders: number;
  /** Files a template's draft holds (the slot becomes empty). */
  readonly inDrafts: number;
}

export const summarizeSelection = (
  items: Iterable<Pick<MediaLibraryItemDto, 'id' | 'size' | 'renderCount'>>,
  draftUsage: ReadonlyMap<string, readonly string[]>,
): SelectionSummary => {
  let count = 0;
  let bytes = 0;
  let inRenders = 0;
  let inDrafts = 0;
  for (const item of items) {
    count += 1;
    bytes += item.size;
    if (item.renderCount > 0) inRenders += 1;
    if ((draftUsage.get(item.id)?.length ?? 0) > 0) inDrafts += 1;
  }
  return { count, bytes, inRenders, inDrafts };
};
