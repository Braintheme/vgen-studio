// Framing of a template's video: rotation, zoom and pan as one schema field (the admin shows it
// as a compact row that opens a popover) and the geometry behind it. Isomorphic: manifests
// import it.
import { z } from 'zod';

export const VIDEO_ROTATIONS = [0, 90, 180, 270] as const;
export type VideoRotation = (typeof VIDEO_ROTATIONS)[number];

/** Reframing of a video inside the frame: zoom >= 1 and a pan of -1..1 per axis (0 = centered). */
export interface VideoFraming {
  /** Clockwise, degrees; for clips filmed sideways. */
  readonly rotate?: VideoRotation;
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
      zoom: slider('Zoom', 1, 3, 0.05, 1, '×'),
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

/**
 * On-screen size (after the rotation) of a cover-fitted media of `size` inside `frame`, and the
 * pan offsets (px) when it is zoomed by `framing.zoom`.
 */
export const framingOffset = (
  size: Size,
  frame: Size,
  framing: VideoFraming,
): { readonly width: number; readonly height: number; readonly x: number; readonly y: number } => {
  const shown = isSideways(framing.rotate) ? { width: size.height, height: size.width } : size;
  const cover = Math.max(frame.width / shown.width, frame.height / shown.height);
  const width = shown.width * cover;
  const height = shown.height * cover;
  const zoom = Math.max(1, framing.zoom);
  return {
    width,
    height,
    x: -framing.x * Math.max(0, (width * zoom - frame.width) / 2),
    y: -framing.y * Math.max(0, (height * zoom - frame.height) / 2),
  };
};
