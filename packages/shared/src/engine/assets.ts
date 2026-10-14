/**
 * Media as handed to a renderer or a browser player: URLs plus intrinsic sizes.
 * In a worker `src` points at the job's local asset server; in the admin at the API.
 */
export interface ResolvedImage {
  readonly kind: 'image';
  readonly src: string;
  readonly width: number;
  readonly height: number;
}

export interface ResolvedVideo {
  readonly kind: 'video';
  readonly src: string;
  readonly width: number;
  readonly height: number;
  readonly durationSec: number;
  /**
   * Where the used fragment starts in `src`, seconds: 0 for the fragment the worker cut,
   * the range start when the admin previews the whole (proxy) video.
   */
  readonly startSec: number;
  readonly hasAudio: boolean;
}

export type ResolvedMediaItem = ResolvedImage | ResolvedVideo;

export type ResolvedMedia = Readonly<Record<string, ResolvedMediaItem | readonly ResolvedMediaItem[] | null>>;

export interface ResolvedAudio {
  readonly src: string;
  readonly durationSec: number;
}

export interface ResolvedAssets {
  readonly media: ResolvedMedia;
  /** `null` when music is disabled or no track is available. */
  readonly music: ResolvedAudio | null;
  /**
   * Library tracks chosen for the template's sound cues (`TemplateDefinition.soundTracks`),
   * by cue key. Cues without an entry use the engine's built-in sound.
   */
  readonly sounds?: Readonly<Record<string, ResolvedAudio>>;
}
