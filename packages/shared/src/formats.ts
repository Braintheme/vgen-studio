import { z } from 'zod';

/** Output aspect formats supported by the platform, with their pixel sizes. */
export const FORMATS = {
  '9:16': { width: 1080, height: 1920 },
  '16:9': { width: 1920, height: 1080 },
  '1:1': { width: 1080, height: 1080 },
  '4:5': { width: 1080, height: 1350 },
  '3:4': { width: 1080, height: 1440 },
} as const;

export const FORMAT_IDS = ['9:16', '16:9', '1:1', '4:5', '3:4'] as const;
export const FormatSchema = z.enum(FORMAT_IDS);
export type Format = z.infer<typeof FormatSchema>;

export const DEFAULT_FORMAT: Format = '9:16';

export const FPS_VALUES = [30, 60] as const;
export const FpsSchema = z.union([z.literal(30), z.literal(60)]);
export type Fps = z.infer<typeof FpsSchema>;

export interface Size {
  readonly width: number;
  readonly height: number;
}

/** Everything a renderer needs to size and time an output video. */
export interface OutputMetadata extends Size {
  readonly fps: number;
  readonly durationInFrames: number;
}

export const computeOutputMetadata = (props: {
  readonly format: Format;
  readonly fps: number;
  readonly durationSec: number;
}): OutputMetadata => ({
  ...FORMATS[props.format],
  fps: props.fps,
  durationInFrames: Math.round(props.durationSec * props.fps),
});
