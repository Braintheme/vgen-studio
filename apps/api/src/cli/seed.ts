// `make seed`: default style preset per template + music tracks from the seed directory.
// Idempotent: existing presets and tracks (matched by title) are left alone.
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
for (const template of catalog.listTemplates()) {
  if ((await presets.list(template.id)).length > 0) {
    logger.log(`presets: "${template.id}" already has presets`);
    continue;
  }
  await presets.create({
    name: DEFAULT_PRESET_NAME,
    templateId: template.id,
    props: resolveTemplateDefaults(template),
  });
  logger.log(`presets: created "${DEFAULT_PRESET_NAME}" (default) for "${template.id}"`);
}

const media = app.get(MediaService);
const music = app.get(MusicService);
const files = await readdir(SEED_DIR).catch(() => [] as string[]);
const audioFiles = files.filter((file) => path.extname(file).toLowerCase() in AUDIO_MIME).sort();
if (audioFiles.length === 0) {
  logger.warn(`music: no audio files in ${SEED_DIR}; renders use no music until a track is added`);
}
const existingTitles = new Set((await music.list()).map((track) => track.title));
for (const file of audioFiles) {
  const title = path.basename(file, path.extname(file));
  if (existingTitles.has(title)) {
    logger.log(`music: "${title}" already in the library`);
    continue;
  }
  const filePath = path.join(SEED_DIR, file);
  const asset = await media.importLocalFile({
    path: filePath,
    originalName: file,
    mime: AUDIO_MIME[path.extname(file).toLowerCase()] ?? 'audio/mpeg',
    size: (await stat(filePath)).size,
  });
  const track = await music.create({ assetId: asset.id, title });
  logger.log(`music: added "${title}"${track.isDefault ? ' (default)' : ''}`);
}

await app.close();
