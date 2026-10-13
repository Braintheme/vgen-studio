import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { Inject, Injectable } from '@nestjs/common';
import type { MediaAssetEntity } from '@vgen/db';
import { computePeaks, probeImage, probeMedia, type ImageInfo } from '@vgen/media';
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
    return kind === 'image' ? this.ingestImage(file) : this.ingestAudio(file);
  }

  private async detectKind(file: IncomingFile): Promise<MediaKind> {
    if (file.mime.startsWith('image/')) return 'image';
    if (file.mime.startsWith('audio/')) return 'audio';
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
      `"${file.originalName}" is not a supported image (JPEG, PNG, WebP) or audio (MP3, WAV, M4A, AAC) file`,
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
}
