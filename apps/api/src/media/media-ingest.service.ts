import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Inject, Injectable } from '@nestjs/common';
import type { MediaAssetEntity } from '@vgen/db';
import {
  computePeaks,
  extractVideoPoster,
  makeFilmstrip,
  makeVideoProxy,
  probeImage,
  probeMedia,
  probeVideo,
  type ImageInfo,
  type VideoInfo,
} from '@vgen/media';
import type { MediaKind } from '@vgen/shared';
import { storageKeys, type StorageService } from '@vgen/storage';
import sharp from 'sharp';
import { UnsupportedMediaError } from '../common/errors.js';
import { STORAGE } from '../storage/storage.module.js';
import { MediaRepository } from './media.repository.js';

export interface IncomingFile {
  readonly path: string;
  readonly originalName: string;
  readonly mime: string;
  readonly size: number;
}

/** Detected image format -> canonical mime/extension (JPEG, PNG, WebP only; no HEIC). */
const IMAGE_FORMATS: Record<string, { mime: string; extension: string }> = {
  jpeg: { mime: 'image/jpeg', extension: 'jpg' },
  png: { mime: 'image/png', extension: 'png' },
  webp: { mime: 'image/webp', extension: 'webp' },
};

/** ffprobe container name -> canonical mime/extension for accepted audio. */
const AUDIO_FORMATS: Record<string, { mime: string; extension: string }> = {
  mp3: { mime: 'audio/mpeg', extension: 'mp3' },
  wav: { mime: 'audio/wav', extension: 'wav' },
  aac: { mime: 'audio/aac', extension: 'aac' },
  'mov,mp4,m4a,3gp,3g2,mj2': { mime: 'audio/mp4', extension: 'm4a' },
};

/** ffprobe container name -> canonical mime/extension for accepted video. */
const VIDEO_FORMATS: Record<string, { mime: string; extension: string }> = {
  'mov,mp4,m4a,3gp,3g2,mj2': { mime: 'video/mp4', extension: 'mp4' },
};

/** QuickTime files keep their extension (the container name is shared with MP4). */
const videoFormatOf = (
  container: string,
  originalName: string,
): { mime: string; extension: string } | null => {
  const format = VIDEO_FORMATS[container];
  if (!format) return null;
  return path.extname(originalName).toLowerCase() === '.mov'
    ? { mime: 'video/quicktime', extension: 'mov' }
    : format;
};

const PREVIEW_SIDE = 1600;

const sha256 = (file: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    createReadStream(file)
      .on('data', (chunk) => hash.update(chunk))
      .on('error', reject)
      .on('end', () => {
        resolve(hash.digest('hex'));
      });
  });

/**
 * Turns an uploaded temp file into a stored MediaAsset. The type is detected from the
 * content (sharp / ffprobe), never trusted from the client's mime or extension.
 */
@Injectable()
export class MediaIngestService {
  constructor(
    @Inject(STORAGE) private readonly storage: StorageService,
    private readonly repository: MediaRepository,
  ) {}

  async ingest(file: IncomingFile): Promise<MediaAssetEntity> {
    const kind = await this.detectKind(file);
    if (kind === 'image') return this.ingestImage(file);
    return kind === 'video' ? this.ingestVideo(file) : this.ingestAudio(file);
  }

  private async detectKind(file: IncomingFile): Promise<MediaKind> {
    if (file.mime.startsWith('image/')) return 'image';
    if (file.mime.startsWith('audio/')) return 'audio';
    // A file with a real video stream is a video, with or without sound.
    if (await probeVideo(file.path).catch(() => null)) return 'video';
    // Unknown or generic client mime: sniff the content.
    if (
      await probeImage(file.path).then(
        () => true,
        () => false,
      )
    )
      return 'image';
    const probe = await probeMedia(file.path).catch(() => null);
    if (probe?.streams.some((stream) => stream.codec_type === 'audio')) return 'audio';
    throw new UnsupportedMediaError(
      `"${file.originalName}" is not a supported image (JPEG, PNG, WebP), video (MP4, MOV) or audio (MP3, WAV, M4A, AAC) file`,
    );
  }

  private async ingestImage(file: IncomingFile): Promise<MediaAssetEntity> {
    let info: ImageInfo;
    try {
      info = await probeImage(file.path);
    } catch {
      throw new UnsupportedMediaError(`"${file.originalName}" is not a readable image`);
    }
    const format = IMAGE_FORMATS[info.format];
    if (!format) {
      throw new UnsupportedMediaError(
        `"${file.originalName}": ${info.format} images are not supported (use JPEG, PNG or WebP)`,
      );
    }
    const id = randomUUID();
    const stored = await this.storage.putFile(
      storageKeys.upload(id, format.extension, new Date()),
      file.path,
    );
    const preview = await sharp(file.path)
      .rotate()
      .resize(PREVIEW_SIDE, PREVIEW_SIDE, { fit: 'inside', withoutEnlargement: true })
      .toColorspace('srgb')
      .webp({ quality: 82 })
      .toBuffer();
    const previewKey = storageKeys.derivative(id, 'preview.webp');
    await this.storage.put(previewKey, preview);
    return this.repository.save({
      id,
      kind: 'image',
      role: 'upload',
      originalName: file.originalName,
      mime: format.mime,
      size: stored.size,
      storageKey: stored.key,
      width: info.width,
      height: info.height,
      durationSec: null,
      checksum: await sha256(file.path),
      meta: { previewKey, colorSpace: info.colorSpace, hasIccProfile: info.hasIccProfile },
    });
  }

  private async ingestAudio(file: IncomingFile): Promise<MediaAssetEntity> {
    const probe = await probeMedia(file.path).catch(() => null);
    const audio = probe?.streams.find((stream) => stream.codec_type === 'audio');
    const format = probe?.format.format_name ? AUDIO_FORMATS[probe.format.format_name] : undefined;
    if (!probe || !audio || !format) {
      throw new UnsupportedMediaError(
        `"${file.originalName}" is not a supported audio file (use MP3, WAV, M4A or AAC)`,
      );
    }
    const id = randomUUID();
    const stored = await this.storage.putFile(
      storageKeys.upload(id, format.extension, new Date()),
      file.path,
    );
    // Waveform peaks let the admin draw the track without decoding it in the browser.
    const peaksKey = storageKeys.derivative(id, 'peaks.json');
    await this.storage.put(peaksKey, Buffer.from(JSON.stringify(await computePeaks(file.path))));
    return this.repository.save({
      id,
      kind: 'audio',
      role: 'upload',
      originalName: file.originalName,
      mime: format.mime,
      size: stored.size,
      storageKey: stored.key,
      width: null,
      height: null,
      durationSec: probe.format.duration ?? audio.duration ?? null,
      checksum: await sha256(file.path),
      meta: { codec: audio.codec_name ?? null, sampleRate: audio.sample_rate ?? null, peaksKey },
    });
  }

  /**
   * Videos keep the original for renders and get browser-friendly derivatives: a poster
   * (the `preview` variant), an H.264 proxy for the player and a filmstrip for trimming.
   */
  private async ingestVideo(file: IncomingFile): Promise<MediaAssetEntity> {
    const info = await probeVideo(file.path).catch(() => null);
    const format = info ? videoFormatOf(info.container, file.originalName) : null;
    if (!info || !format || info.durationSec <= 0) {
      throw new UnsupportedMediaError(
        `"${file.originalName}" is not a supported video file (use MP4 or MOV)`,
      );
    }
    const id = randomUUID();
    const work = await mkdtemp(path.join(os.tmpdir(), 'vgen-video-'));
    try {
      const derived = await this.videoDerivatives(id, file.path, info, work);
      const stored = await this.storage.putFile(
        storageKeys.upload(id, format.extension, new Date()),
        file.path,
      );
      return await this.repository.save({
        id,
        kind: 'video',
        role: 'upload',
        originalName: file.originalName,
        mime: format.mime,
        size: stored.size,
        storageKey: stored.key,
        width: info.width,
        height: info.height,
        durationSec: info.durationSec,
        checksum: await sha256(file.path),
        meta: { ...derived, codec: info.codec, fps: info.fps, hasAudio: info.hasAudio },
      });
    } finally {
      await rm(work, { recursive: true, force: true });
    }
  }

  private async videoDerivatives(
    id: string,
    input: string,
    info: VideoInfo,
    work: string,
  ): Promise<Record<string, unknown>> {
    const failed = (what: string) => (error: unknown) => {
      throw new UnsupportedMediaError(`Could not read the video (${what}): ${String(error)}`);
    };
    const posterJpeg = path.join(work, 'poster.jpg');
    await extractVideoPoster(input, posterJpeg, info).catch(failed('poster'));
    const previewKey = storageKeys.derivative(id, 'preview.webp');
    await this.storage.put(
      previewKey,
      await sharp(posterJpeg)
        .resize(PREVIEW_SIDE, PREVIEW_SIDE, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer(),
    );

    const proxyFile = path.join(work, 'proxy.mp4');
    await makeVideoProxy(input, proxyFile, info).catch(failed('proxy'));
    const proxyKey = storageKeys.derivative(id, 'proxy.mp4');
    await this.storage.putFile(proxyKey, proxyFile);

    const filmstripFile = path.join(work, 'filmstrip.jpg');
    const filmstrip = await makeFilmstrip(input, filmstripFile, info).catch(failed('filmstrip'));
    const filmstripKey = storageKeys.derivative(id, 'filmstrip.jpg');
    await this.storage.putFile(filmstripKey, filmstripFile);

    return { previewKey, proxyKey, filmstripKey, filmstrip };
  }
}
