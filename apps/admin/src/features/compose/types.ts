import type { FilmstripDto, MediaAssetDto, MediaWarning, MusicTrackDto, SlotMediaKind } from '@vgen/shared';
import type { WaveformSource } from '@/lib/waveform-region';

/** Everything a media slot card shows. */
export interface MediaSlotView {
  readonly key: string;
  readonly kind: SlotMediaKind;
  readonly label: string;
  readonly description: string | null;
  readonly required: boolean;
  readonly multiple: boolean;
  /** Most items a list slot takes. */
  readonly maxItems: number;
  readonly accept: string;
  readonly assets: readonly MediaAssetDto[];
  /** Upload in progress (0..1), or null. */
  readonly uploadProgress: number | null;
  readonly error: string | null;
}

export interface SlotActionView {
  readonly id: string;
  readonly label: string;
  readonly slots: readonly [string, string];
  readonly enabled: boolean;
}

export interface OutputSummary {
  readonly width: number;
  readonly height: number;
  readonly fps: number;
  readonly durationSec: number;
}

export type { MediaWarning };

/** Why the music section shows a hint. */
export type MusicNotice = 'library-empty' | 'no-default' | 'track-loops';

export interface MusicWidgetsView {
  readonly enabled: boolean;
  readonly tracks: readonly MusicTrackDto[];
  readonly defaultTrack: MusicTrackDto | null;
  /** Length of the used fragment: the video duration, or the whole (looping) track. */
  readonly regionSec: number;
  /** Null while there is nothing to draw (no track, or peaks still loading). */
  readonly waveform: WaveformSource | null;
  readonly notice: MusicNotice | null;
}

/** Server-rendered preview frame (engines without a browser player). */
export interface PosterPreviewView {
  readonly url: string | null;
  readonly width: number;
  readonly height: number;
  readonly loading: boolean;
  /** Why there is no (fresh) frame, if anything. */
  readonly message: string | null;
}

/** The video a `video-range` field trims (its slot's current asset). */
export interface VideoRangeSource {
  /** Browser-friendly copy (proxy) of the video. */
  readonly url: string;
  readonly posterUrl: string | null;
  readonly durationSec: number;
  readonly filmstrip: FilmstripDto | null;
}

export interface MediaPickerSlot {
  readonly key: string;
  readonly label: string;
  readonly kind: 'image' | 'video';
  /** How many files can still go in (1 for a single slot: it is replaced). */
  readonly room: number;
}
