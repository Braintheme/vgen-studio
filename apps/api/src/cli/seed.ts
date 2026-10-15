// `make seed`: music tracks from the seed directory + a default style preset per template.
// Idempotent: existing presets and tracks (matched by title) are left alone.
//
// Layout of the seed directory:
//   seed/<track>.mp3|wav|m4a|aac                  library tracks (the first one of an empty
//                                                 library becomes the default track)
//   seed/templates/<templateId>/<track>.<ext>     a template's own track: added to the library
//                                                 and used by that template's "Default" preset
import 'reflect-metadata';
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { resolveTemplateDefaults } from '@vgen/shared';
import { AppModule } from '../app.module.js';
import { CatalogService } from '../catalog/catalog.service.js';
import { MediaService } from '../media/media.service.js';
import { MusicService } from '../music/music.service.js';
import { PresetsService } from '../presets/presets.service.js';

const SEED_DIR = process.env['SEED_DIR'] ?? path.resolve(process.env['INIT_CWD'] ?? process.cwd(), 'seed');
const AUDIO_MIME: Readonly<Record<string, string>> = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
};
const DEFAULT_PRESET_NAME = 'Default';

const logger = new Logger('Seed');
const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn', 'log'] });

const catalog = app.get(CatalogService);
const presets = app.get(PresetsService);
const media = app.get(MediaService);
const music = app.get(MusicService);

const audioFilesIn = async (dir: string): Promise<string[]> =>
  (await readdir(dir).catch(() => [] as string[]))
    .filter((file) => path.extname(file).toLowerCase() in AUDIO_MIME)
    .sort();

const trackIds = new Map((await music.list()).map((track) => [track.title, track.id]));

/** Adds a file to the library (once, matched by title) and returns its track id. */
const importTrack = async (dir: string, file: string): Promise<string> => {
  const title = path.basename(file, path.extname(file));
  const existing = trackIds.get(title);
  if (existing) {
    logger.log(`music: "${title}" already in the library`);
    return existing;
  }
  const filePath = path.join(dir, file);
  const asset = await media.importLocalFile({
    path: filePath,
    originalName: file,
    mime: AUDIO_MIME[path.extname(file).toLowerCase()] ?? 'audio/mpeg',
    size: (await stat(filePath)).size,
  });
  const track = await music.create({ assetId: asset.id, title });
  trackIds.set(title, track.id);
  logger.log(`music: added "${title}"${track.isDefault ? ' (default)' : ''}`);
  return track.id;
};

// Library tracks first, so the library default stays one of them.
const audioFiles = await audioFilesIn(SEED_DIR);
if (audioFiles.length === 0) {
  logger.warn(`music: no audio files in ${SEED_DIR}; renders use no music until a track is added`);
}
for (const file of audioFiles) {
  await importTrack(SEED_DIR, file);
}

for (const template of catalog.listTemplates()) {
  const templateDir = path.join(SEED_DIR, 'templates', template.id);
  const [ownTrack] = await audioFilesIn(templateDir);
  const trackId = ownTrack ? await importTrack(templateDir, ownTrack) : null;
  if ((await presets.list(template.id)).length > 0) {
    logger.log(`presets: "${template.id}" already has presets`);
    continue;
  }
  const defaults = resolveTemplateDefaults(template);
  await presets.create({
    name: DEFAULT_PRESET_NAME,
    templateId: template.id,
    props: trackId ? { ...defaults, music: { ...defaults.music, trackId } } : defaults,
  });
  logger.log(
    `presets: created "${DEFAULT_PRESET_NAME}" (default) for "${template.id}"${trackId ? ' with its own track' : ''}`,
  );
}

await app.close();
