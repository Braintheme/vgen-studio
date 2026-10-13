import sharp from 'sharp';
import { z } from 'zod';
import { run } from './process.js';

export interface ImageInfo {
  /** Display size, i.e. after applying EXIF orientation. */
  readonly width: number;
  readonly height: number;
  readonly format: string;
  readonly colorSpace: string;
  readonly hasIccProfile: boolean;
}

/** Image metadata with EXIF orientation taken into account. */
export const probeImage = async (input: string | Buffer): Promise<ImageInfo> => {
  const meta = await sharp(input).metadata();
  // Orientations 5-8 rotate by 90°, swapping width and height.
  const rotated = (meta.orientation ?? 1) >= 5;
  return {
    width: rotated ? meta.height : meta.width,
    height: rotated ? meta.width : meta.height,
    format: meta.format,
    colorSpace: meta.space,
    hasIccProfile: Boolean(meta.icc),
  };
};

const FfprobeSchema = z.object({
  format: z.object({ duration: z.coerce.number().optional(), format_name: z.string().optional() }),
  streams: z.array(
    z.object({
      codec_type: z.string(),
      codec_name: z.string().optional(),
      width: z.number().optional(),
      height: z.number().optional(),
      pix_fmt: z.string().optional(),
      sample_rate: z.coerce.number().optional(),
      r_frame_rate: z.string().optional(),
      duration: z.coerce.number().optional(),
    }),
  ),
});

export type MediaProbe = z.infer<typeof FfprobeSchema>;

/** Container/stream information via ffprobe (audio and video files). */
export const probeMedia = async (filePath: string): Promise<MediaProbe> => {
  const { stdout } = await run('ffprobe', [
    '-v',
    'error',
    '-print_format',
    'json',
    '-show_format',
    '-show_streams',
    filePath,
  ]);
  return FfprobeSchema.parse(JSON.parse(stdout));
};

/** Byte offsets of the top-level `moov` and `mdat` boxes of an MP4 file (faststart check). */
export const mp4BoxOrder = async (filePath: string): Promise<'faststart' | 'moov-at-end' | 'unknown'> => {
  const { open } = await import('node:fs/promises');
  const handle = await open(filePath, 'r');
  try {
    const header = Buffer.alloc(8);
    let offset = 0;
    const { size } = await handle.stat();
    while (offset < size) {
      await handle.read(header, 0, 8, offset);
      let boxSize = header.readUInt32BE(0);
      const type = header.toString('ascii', 4, 8);
      if (type === 'moov') return 'faststart';
      if (type === 'mdat') return 'moov-at-end';
      if (boxSize === 1) {
        const large = Buffer.alloc(8);
        await handle.read(large, 0, 8, offset + 8);
        boxSize = Number(large.readBigUInt64BE(0));
      }
      if (boxSize < 8) return 'unknown';
      offset += boxSize;
    }
    return 'unknown';
  } finally {
    await handle.close();
  }
};
