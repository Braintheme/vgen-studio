import type { Size } from '../formats.js';
import type { MediaWarning } from './media-slots.js';

/** A normalized image file in the worker's job directory. */
export interface PreparedImage extends Size {
  readonly path: string;
  readonly mime: string;
}

export type PreparedMedia = PreparedImage | readonly PreparedImage[] | null;
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
  /** Media after the generic normalization (EXIF, sRGB, resize, sharpen). */
  readonly media: PreparedMediaMap;
  readonly images: ImageToolkit;
  warn(warning: MediaWarning): void;
}
