import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { clipSize, createSharpToolkit, cutVideoClip, normalizePhoto, probeVideo } from '@vgen/media';
import {
  valueAtPath,
  type BaseProps,
  type MediaSlot,
  type MediaWarning,
  type PreparedImage,
  type PreparedMedia,
  type PreparedVideo,
  type ResolvedAssets,
  type ResolvedAudio,
  type ResolvedImage,
  type ResolvedMedia,
  type ResolvedVideo,
  type Size,
  type TemplateDefinition,
} from '@vgen/shared';
import type { StorageService } from '@vgen/storage';
import { throwIfCancelled } from '../abort.js';
import { PermanentJobError } from '../errors.js';
import type { Logger } from '../logger.js';
import type { MediaAssetRecord, MediaAssetStore, MusicLibrary } from '../ports.js';
import type { AssetServer } from './asset-server.js';

export interface PrepareDeps {
  readonly storage: StorageService;
  readonly media: MediaAssetStore;
  readonly music: MusicLibrary;
  readonly assetServer: AssetServer;
  readonly logger: Logger;
}

export interface PrepareInput {
  readonly jobId: string;
  readonly template: TemplateDefinition;
  readonly props: BaseProps;
  readonly frame: Size;
  readonly workDir: string;
  readonly signal: AbortSignal;
}

const extensionOf = (asset: MediaAssetRecord): string => path.extname(asset.storageKey) || '.bin';

/** Video fragments cover the frame this many times over: headroom for zooms and punch-ins. */
const VIDEO_OVERSAMPLE = 2;
/** Long-side cap of a cut fragment: keeps decoding fast and memory flat (8 GB Docker). */
const VIDEO_MAX_SIDE = 2880;

const isVideo = (media: PreparedImage | PreparedVideo): media is PreparedVideo => 'kind' in media;

/** The `{ startSec, endSec }` a video slot points at, clamped to the video. */
const rangeOf = (
  props: BaseProps,
  slot: MediaSlot,
  durationSec: number,
): { startSec: number; durationSec: number } => {
  const value = slot.range ? valueAtPath(props, slot.range) : undefined;
  const range = (value ?? {}) as { startSec?: unknown; endSec?: unknown };
  const start = typeof range.startSec === 'number' ? range.startSec : 0;
  const end = typeof range.endSec === 'number' ? range.endSec : durationSec;
  const startSec = Math.min(Math.max(0, start), Math.max(0, durationSec - 0.1));
  return { startSec, durationSec: Math.max(0.1, Math.min(end, durationSec) - startSec) };
};

const asList = (value: string | readonly string[] | null | undefined): string[] =>
  value === null || value === undefined ? [] : typeof value === 'string' ? [value] : [...value];

/**
 * Generic asset preparation shared by all engines and templates:
 * originals -> normalized photos (EXIF, sRGB, sized for the frame, sharpened unless the
 * template renders images: those sharpen at their final size in `prepareAssets`) and cut video
 * fragments (the chosen range, output fps) ->
 * template hook -> URLs on the local asset server. Music is used as is.
 */
export const prepareJobAssets = async (deps: PrepareDeps, input: PrepareInput): Promise<ResolvedAssets> => {
  const { template, props, workDir, signal, jobId } = input;
  // Image outputs have no audio.
  const stills = template.output === 'stills';
  const sourcesDir = path.join(workDir, 'sources');
  await mkdir(sourcesDir, { recursive: true });

  const ids = template.mediaSlots.flatMap((slot) => asList(props.media[slot.key]));
  const assets = new Map((await deps.media.findByIds(ids)).map((asset) => [asset.id, asset]));

  const prepared: Record<string, PreparedMedia> = {};
  for (const slot of template.mediaSlots) {
    const items: PreparedImage[] = [];
    let video: PreparedVideo | null = null;
    for (const [index, id] of asList(props.media[slot.key]).entries()) {
      throwIfCancelled(signal, jobId);
      const asset = assets.get(id);
      if (!asset) {
        throw new PermanentJobError(`Media "${id}" for slot "${slot.key}" no longer exists`);
      }
      if (asset.kind !== slot.kind) {
        throw new PermanentJobError(`Slot "${slot.key}" expects ${slot.kind}, got ${asset.kind}`);
      }
      const source = path.join(sourcesDir, `${asset.id}${extensionOf(asset)}`);
      await deps.storage.downloadTo(asset.storageKey, source);
      if (slot.kind === 'video') {
        video = await cutFragment(source, path.join(workDir, `${slot.key}-${index}.mp4`), {
          props,
          slot,
          frame: input.frame,
          signal,
        });
        continue;
      }
      items.push(
        await normalizePhoto(source, path.join(workDir, `${slot.key}-${index}.jpg`), {
          frame: input.frame,
          // Image outputs sharpen once, at the size the photo is drawn (template hook).
          sharpen: stills ? 'off' : props.imageProcessing.sharpen,
        }),
      );
    }
    prepared[slot.key] = slot.kind === 'video' ? video : slot.multiple ? items : (items[0] ?? null);
  }

  let media = prepared as Readonly<Record<string, PreparedMedia>>;
  if (template.prepareAssets) {
    throwIfCancelled(signal, jobId);
    let counter = 0;
    media = await template.prepareAssets({
      props,
      frame: input.frame,
      media,
      images: createSharpToolkit((image, size) =>
        path.join(
          workDir,
          `${path.basename(image.path, '.jpg')}-${size.width}x${size.height}-${(counter += 1)}.jpg`,
        ),
      ),
      warn: (warning: MediaWarning) => {
        deps.logger.warn('template asset warning', { code: warning.code, detail: warning.message });
      },
    });
  }

  const toResolved = (item: PreparedImage | PreparedVideo): ResolvedImage | ResolvedVideo =>
    isVideo(item)
      ? {
          kind: 'video',
          src: deps.assetServer.urlFor(item.path),
          width: item.width,
          height: item.height,
          durationSec: item.durationSec,
          startSec: 0,
          hasAudio: item.hasAudio,
        }
      : { kind: 'image', src: deps.assetServer.urlFor(item.path), width: item.width, height: item.height };
  const resolvedMedia: Record<string, ResolvedMedia[string]> = {};
  for (const [key, value] of Object.entries(media)) {
    resolvedMedia[key] =
      value === null
        ? null
        : Array.isArray(value)
          ? (value as readonly PreparedImage[]).map(toResolved)
          : toResolved(value as PreparedImage | PreparedVideo);
  }

  let music: ResolvedAssets['music'] = null;
  if (props.music.enabled && !stills) {
    const track = await deps.music.resolve(props.music.trackId);
    if (track) {
      const file = path.join(workDir, `music${extensionOf(track.asset)}`);
      await deps.storage.downloadTo(track.asset.storageKey, file);
      music = { src: deps.assetServer.urlFor(file), durationSec: track.durationSec };
    } else {
      deps.logger.warn('music enabled but no track available; rendering with a silent track', {
        trackId: props.music.trackId,
      });
    }
  }

  const sounds: Record<string, ResolvedAudio> = {};
  for (const [cue, trackId] of Object.entries(stills ? {} : (template.soundTracks?.(props) ?? {}))) {
    const track = await deps.music.resolve(trackId);
    if (!track) {
      deps.logger.warn('sound track not found; the built-in sound plays instead', { cue, trackId });
      continue;
    }
    const file = path.join(workDir, `sound-${cue}${extensionOf(track.asset)}`);
    await deps.storage.downloadTo(track.asset.storageKey, file);
    sounds[cue] = { src: deps.assetServer.urlFor(file), durationSec: track.durationSec };
  }

  return { media: resolvedMedia, music, sounds };
};

/** Cuts the slot's chosen fragment at the output fps, sized for the frame. */
const cutFragment = async (
  source: string,
  output: string,
  options: { props: BaseProps; slot: MediaSlot; frame: Size; signal: AbortSignal },
): Promise<PreparedVideo> => {
  const info = await probeVideo(source);
  if (!info) {
    throw new PermanentJobError(`Slot "${options.slot.key}": the file has no video stream`);
  }
  const range = rangeOf(options.props, options.slot, info.durationSec);
  const size = clipSize(info, options.frame, VIDEO_OVERSAMPLE, VIDEO_MAX_SIDE);
  await cutVideoClip(source, output, {
    ...range,
    fps: options.props.fps,
    size,
    keepAudio: info.hasAudio,
    signal: options.signal,
  });
  return {
    kind: 'video',
    path: output,
    mime: 'video/mp4',
    ...size,
    durationSec: range.durationSec,
    hasAudio: info.hasAudio,
  };
};
