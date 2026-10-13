import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { createSharpToolkit, normalizePhoto } from '@vgen/media';
import type {
  BaseProps,
  MediaWarning,
  PreparedImage,
  PreparedMedia,
  ResolvedAssets,
  ResolvedImage,
  ResolvedMedia,
  Size,
  TemplateDefinition,
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

const asList = (value: string | readonly string[] | null | undefined): string[] =>
  value === null || value === undefined ? [] : typeof value === 'string' ? [value] : [...value];

/**
 * Generic asset preparation shared by all engines and templates:
 * originals -> normalized photos (EXIF, sRGB, sized for the frame, sharpened) ->
 * template hook -> URLs on the local asset server. Music is used as is.
 */
export const prepareJobAssets = async (deps: PrepareDeps, input: PrepareInput): Promise<ResolvedAssets> => {
  const { template, props, workDir, signal, jobId } = input;
  const sourcesDir = path.join(workDir, 'sources');
  await mkdir(sourcesDir, { recursive: true });

  const ids = template.mediaSlots.flatMap((slot) => asList(props.media[slot.key]));
  const assets = new Map((await deps.media.findByIds(ids)).map((asset) => [asset.id, asset]));

  const prepared: Record<string, PreparedMedia> = {};
  for (const slot of template.mediaSlots) {
    const items: PreparedImage[] = [];
    for (const [index, id] of asList(props.media[slot.key]).entries()) {
      throwIfCancelled(signal, jobId);
      const asset = assets.get(id);
      if (!asset) {
        throw new PermanentJobError(`Media "${id}" for slot "${slot.key}" no longer exists`);
      }
      if (asset.kind !== 'image') {
        throw new PermanentJobError(`Slot "${slot.key}" expects an image, got ${asset.kind}`);
      }
      const source = path.join(sourcesDir, `${asset.id}${extensionOf(asset)}`);
      await deps.storage.downloadTo(asset.storageKey, source);
      items.push(
        await normalizePhoto(source, path.join(workDir, `${slot.key}-${index}.jpg`), {
          frame: input.frame,
          sharpen: props.imageProcessing.sharpen,
        }),
      );
    }
    prepared[slot.key] = slot.multiple ? items : (items[0] ?? null);
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

  const toResolved = (image: PreparedImage): ResolvedImage => ({
    kind: 'image',
    src: deps.assetServer.urlFor(image.path),
    width: image.width,
    height: image.height,
  });
  const resolvedMedia: Record<string, ResolvedMedia[string]> = {};
  for (const [key, value] of Object.entries(media)) {
    resolvedMedia[key] =
      value === null
        ? null
        : Array.isArray(value)
          ? value.map(toResolved)
          : toResolved(value as PreparedImage);
  }

  let music: ResolvedAssets['music'] = null;
  if (props.music.enabled) {
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

  return { media: resolvedMedia, music };
};
