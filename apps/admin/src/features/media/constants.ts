import type { MediaLibraryQuery } from '@vgen/shared';
import type { SelectOption } from '@/lib/ui-types';
import type { LibraryKindFilter } from './types';

export const MEDIA_PAGE_SIZE = 48;
/** "Delete unused files older than N days": the suggested N. */
export const CLEANUP_DEFAULT_DAYS = 14;

export const KIND_OPTIONS: readonly SelectOption<LibraryKindFilter>[] = [
  { value: 'all', label: 'All' },
  { value: 'image', label: 'Photos' },
  { value: 'video', label: 'Videos' },
];

export const SORT_OPTIONS: readonly SelectOption<MediaLibraryQuery['sort']>[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'largest', label: 'Largest first' },
];
