import type { Size } from '../formats.js';
import type { MediaWarning } from './media-slots.js';

/** A normalized image file in the worker's job directory. */
export interface PreparedImage extends Size {
  readonly path: string;
  readonly mime: string;
}

/** A video fragment cut and normalized for the render (H.264, output fps, sized for the frame). */
export interface PreparedVideo extends Size {
  readonly kind: 'video';
  readonly path: string;
  readonly mime: string;
  readonly durationSec: number;
  readonly hasAudio: boolean;
}

export type PreparedMedia = PreparedImage | PreparedVideo | readonly PreparedImage[] | null;
export type PreparedMediaMap = Readonly<Record<string, PreparedMedia>>;

export type ResizeFit = 'cover' | 'contain' | 'fill';

/** Image operations available to template hooks (implemented by the worker, e.g. with sharp). */
export interface ImageToolkit {
  resize(image: PreparedImage, size: Size, options?: { readonly fit?: ResizeFit }): Promise<PreparedImage>;
}

export interface PrepareAssetsContext<P> {
  readonly props: P;
  /** Output frame size of the render. */
  readonly frame: Size;
  /** Media after the generic normalization (photos: EXIF, sRGB, resize, sharpen; videos: the cut fragment). */
  readonly media: PreparedMediaMap;
  readonly images: ImageToolkit;
  warn(warning: MediaWarning): void;
}
