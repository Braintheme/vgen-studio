import { UPLOAD_MIME_TYPES } from '@vgen/shared';
import type { SectionLayout } from '@/lib/schema-form';

/** Sections shown before the template's own groups. */
export const LEADING_SECTIONS: readonly SectionLayout[] = [
  { id: 'output', title: 'Format & timing', paths: ['format', 'durationSec', 'fps'] },
];

/** Sections shown after the template's own groups. */
export const TRAILING_SECTIONS: readonly SectionLayout[] = [
  { id: 'style', title: 'Style', paths: ['style'] },
  { id: 'image', title: 'Photo processing', paths: ['imageProcessing'] },
  { id: 'music', title: 'Music', paths: ['music'] },
];

/** Template-defined props without a fixed section land here. */
export const TEMPLATE_ROOTS = ['texts', 'params'] as const;
export const OTHER_SECTION = { id: 'other', title: 'More options' } as const;

/** Props that are not edited by hand. */
export const HIDDEN_PATHS: readonly string[] = ['seed'];

/** Debounce between form edits and preview/draft updates. */
export const PREVIEW_DEBOUNCE_MS = 200;
export const DRAFT_SAVE_DEBOUNCE_MS = 500;

export const ACCEPT_BY_SLOT_KIND = {
  image: UPLOAD_MIME_TYPES.image.join(','),
  video: 'video/mp4,video/quicktime',
} as const;

export const QUALITY_OPTIONS = [
  { value: 'social', label: 'Social (recommended)' },
  { value: 'high', label: 'High (archive)' },
] as const;

/** Select value for "no preset" (select items cannot hold null). */
export const NO_PRESET_VALUE = 'none';

/** Select value for "use the library default track". */
export const DEFAULT_TRACK_VALUE = 'library-default';

/** The music fragment start is stored with this many decimals (0.1 s). */
export const MUSIC_START_DECIMALS = 1;

/** Title of the single toast that lists what was fixed in a stored draft. */
export const DRAFT_NOTICE_TITLE = 'Your draft was updated';

/** Debounce before asking the worker for a new preview frame (engines without a player). */
export const POSTER_PREVIEW_DEBOUNCE_MS = 800;
