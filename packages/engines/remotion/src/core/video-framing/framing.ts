// Framing of a template's video: rotation, straightening, scale and pan as one schema field (the admin shows it
// as a compact row that opens a popover) and the geometry behind it. Isomorphic: manifests
// import it.
import { z } from 'zod';

export const VIDEO_ROTATIONS = [0, 90, 180, 270] as const;
export type VideoRotation = (typeof VIDEO_ROTATIONS)[number];

/** Reframing of a video inside the frame: zoom >= 1 and a pan of -1..1 per axis (0 = centered). */
export interface VideoFraming {
  /** Clockwise, degrees; for clips filmed sideways. */
  readonly rotate?: VideoRotation;
  /** Straightening, degrees (clockwise > 0); the clip grows to keep the frame filled. */
  readonly tilt?: number;
  /** Scale on top of the cover fit (and of the straightening's fill), >= 1. */
  readonly zoom: number;
  readonly x: number;
  readonly y: number;
}

const slider = (title: string, min: number, max: number, step: number, value: number, unit?: string) =>
  z
    .number()
    .min(min)
    .max(max)
    .default(value)
    .meta({ title, widget: 'slider', step, ...(unit ? { unit } : {}) });

/** `params.framing` of every template with a video slot. */
export const videoFramingField = () =>
  z
    .object({
      rotate: z
        .union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)])
        .default(0)
        .meta({
          title: 'Rotate clockwise',
          widget: 'segmented',
          optionLabels: { '0': '0°', '90': '90°', '180': '180°', '270': '270°' },
        }),
      tilt: slider('Straighten', -45, 45, 0.1, 0, '°'),
      // Stored as `zoom` (older drafts and presets keep their value).
      zoom: slider('Scale', 1, 3, 0.05, 1, '×'),
      x: slider('Move left / right', -1, 1, 0.05, 0),
      y: slider('Move up / down', -1, 1, 0.05, 0),
    })
    .prefault({})
    .meta({ title: 'Framing', widget: 'popover', scope: 'content' });

interface Size {
  readonly width: number;
  readonly height: number;
}

/** A quarter turn swaps the width and the height the media takes on screen. */
export const isSideways = (rotate: VideoRotation = 0): boolean => rotate % 180 !== 0;

export interface FramingFit {
  /** On-screen size (after the quarter turn) of the cover-fitted media, before `scale`. */
  readonly width: number;
  readonly height: number;
  /** Pan offset of the media's centre, px. */
  readonly x: number;
  readonly y: number;
  /** Total scale: the straightening's fill times `zoom`. */
  readonly scale: number;
  /** Straightening, degrees. */
  readonly tilt: number;
}

/**
 * On-screen size (after the rotation) of a cover-fitted media of `size` inside `frame`, its total
 * scale and the pan offsets (px). A tilt grows the media just enough to keep the frame filled
 * (like a straighten tool), and the pan never uncovers a corner.
 */
export const framingOffset = (size: Size, frame: Size, framing: VideoFraming): FramingFit => {
  const shown = isSideways(framing.rotate) ? { width: size.height, height: size.width } : size;
  const cover = Math.max(frame.width / shown.width, frame.height / shown.height);
  const width = shown.width * cover;
  const height = shown.height * cover;
  const zoom = Math.max(1, framing.zoom);
  const tilt = framing.tilt ?? 0;
  if (tilt === 0) {
    return {
      width,
      height,
      x: -framing.x * Math.max(0, (width * zoom - frame.width) / 2),
      y: -framing.y * Math.max(0, (height * zoom - frame.height) / 2),
      scale: zoom,
      tilt,
    };
  }
  const angle = (tilt * Math.PI) / 180;
  const cos = Math.abs(Math.cos(angle));
  const sin = Math.abs(Math.sin(angle));
  // The frame's extent along the tilted media's axes.
  const spanU = frame.width * cos + frame.height * sin;
  const spanV = frame.width * sin + frame.height * cos;
  const scale = Math.max(spanU / width, spanV / height, 1) * zoom;
  // Pan in the media's axes, then back to the screen (rotated by the tilt).
  const u = framing.x * Math.max(0, (width * scale - spanU) / 2);
  const v = framing.y * Math.max(0, (height * scale - spanV) / 2);
  return {
    width,
    height,
    x: -(u * Math.cos(angle) - v * Math.sin(angle)),
    y: -(u * Math.sin(angle) + v * Math.cos(angle)),
    scale,
    tilt,
  };
};
