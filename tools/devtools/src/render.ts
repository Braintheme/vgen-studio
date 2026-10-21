// Renders a template end-to-end through the real queue and worker, without the API.
// make render args="--template=before-after --media=before:fixtures/before.jpg --media=after:fixtures/after.jpg"
// Options: --props='{"format":"16:9"}' --music=path.mp3 --quality=high --cancel-after=3 --no-wait
import 'reflect-metadata';
import { createHash, randomUUID } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { createCatalog } from '@vgen/catalog';
import { createDataSourceOptions, MediaAssetEntity, MusicTrackEntity, RenderJobEntity } from '@vgen/db';
import { probeImage, probeMedia } from '@vgen/media';
import {
  buildOutputFileName,
  deepMerge,
  parseTemplateProps,
  QualityPresetSchema,
  RENDER_CANCEL_CHANNEL,
  RENDER_EVENTS_CHANNEL,
  RenderEventSchema,
  renderQueueName,
  type MediaKind,
} from '@vgen/shared';
import { LocalStorageService, storageKeys } from '@vgen/storage';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { DataSource } from 'typeorm';

const { values } = parseArgs({
  options: {
    template: { type: 'string', default: 'before-after' },
    media: { type: 'string', multiple: true, default: [] },
    props: { type: 'string', default: '{}' },
    music: { type: 'string' },
    quality: { type: 'string', default: 'social' },
    'cancel-after': { type: 'string' },
    wait: { type: 'boolean', default: true },
    'no-wait': { type: 'boolean', default: false },
  },
});

const env = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
};

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.wav': 'audio/wav',
  '.aac': 'audio/aac',
};

/** pnpm runs scripts from the package dir; resolve user paths from where `make` was invoked. */
const userPath = (file: string): string => path.resolve(process.env['INIT_CWD'] ?? process.cwd(), file);

const dataSource = new DataSource(createDataSourceOptions({ url: env('DATABASE_URL') }));
await dataSource.initialize();
const storage = new LocalStorageService(process.env['MEDIA_ROOT'] ?? '/data/media');
const { templates } = createCatalog();
const template = templates.get(values.template);

/** Stores a local file as an uploaded MediaAsset (what POST /media will do). */
const ingest = async (file: string, kind: MediaKind): Promise<MediaAssetEntity> => {
  const extension = path.extname(file).toLowerCase();
  const mime = MIME[extension];
  if (!mime) throw new Error(`Unsupported file type: ${file}`);
  const id = randomUUID();
  const stored = await storage.putFile(storageKeys.upload(id, extension.slice(1), new Date()), file);
  const image = kind === 'image' ? await probeImage(file) : null;
  const probe = kind === 'audio' ? await probeMedia(file) : null;
  const repository = dataSource.getRepository(MediaAssetEntity);
  return repository.save(
    repository.create({
      id,
      kind,
      role: 'upload',
      originalName: path.basename(file),
      mime,
      size: (await stat(file)).size,
      storageKey: stored.key,
      width: image?.width ?? null,
      height: image?.height ?? null,
      durationSec: probe?.format.duration ?? null,
      checksum: createHash('sha256')
        .update(await readFile(file))
        .digest('hex'),
      meta: {},
    }),
  );
};

const media: Record<string, string> = {};
for (const entry of values.media) {
  const [slot = '', file = ''] = entry.split(':');
  media[slot] = (await ingest(userPath(file), 'image')).id;
}

let musicOverride: Record<string, unknown> = {};
if (values.music) {
  const asset = await ingest(userPath(values.music), 'audio');
  const tracks = dataSource.getRepository(MusicTrackEntity);
  const track = await tracks.save(
    tracks.create({
      title: path.basename(values.music),
      assetId: asset.id,
      durationSec: asset.durationSec ?? 0,
    }),
  );
  musicOverride = { music: { enabled: true, trackId: track.id } };
}

const parsed = parseTemplateProps(
  template,
  deepMerge(deepMerge(JSON.parse(values.props) as unknown, musicOverride), { media }),
);
if (!parsed.success) {
  throw new Error(
    `Invalid props: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`,
  );
}
const quality = QualityPresetSchema.parse(values.quality);

const jobs = dataSource.getRepository(RenderJobEntity);
const job = await jobs.save(
  jobs.create({
    status: 'queued',
    engine: template.engine,
    templateId: template.id,
    templateVersion: template.version,
    props: parsed.data as unknown as Record<string, unknown>,
    format: parsed.data.format,
    quality,
    outputName: buildOutputFileName({
      templateId: template.id,
      presetName: null,
      format: parsed.data.format,
      date: new Date(),
      extension: template.output === 'stills' ? 'zip' : 'mp4',
    }),
  }),
);

const connection = new Redis(env('REDIS_URL'), { maxRetriesPerRequest: null });
const queue = new Queue(renderQueueName(template.engine), { connection });
await queue.add(
  'render',
  { renderJobId: job.id },
  {
    jobId: job.id,
    attempts: 2,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 200,
    removeOnFail: 500,
  },
);
console.log(`queued render ${job.id} (${template.id}, ${parsed.data.format}, ${quality})`);

if (values['no-wait']) {
  await queue.close();
  connection.disconnect();
  await dataSource.destroy();
  process.exit(0);
}

const subscriber = new Redis(env('REDIS_URL'));
await subscriber.subscribe(RENDER_EVENTS_CHANNEL);
const startedAt = Date.now();

if (values['cancel-after']) {
  // Mirrors what POST /renders/:id/cancel will do in the API.
  setTimeout(
    () => {
      void (async () => {
        await jobs
          .createQueryBuilder()
          .update()
          .set({ status: 'cancelled', finishedAt: new Date() })
          .where('id = :id AND status IN (:...statuses)', { id: job.id, statuses: ['queued', 'rendering'] })
          .execute();
        await connection.publish(RENDER_CANCEL_CHANNEL, JSON.stringify({ jobId: job.id }));
        console.log('cancel requested');
      })();
    },
    Number(values['cancel-after']) * 1000,
  );
}

const finish = async (code: number): Promise<never> => {
  subscriber.disconnect();
  await queue.close();
  connection.disconnect();
  await dataSource.destroy();
  process.exit(code);
};

const report = async (): Promise<void> => {
  const current = await jobs.findOneByOrFail({ id: job.id });
  if (current.status === 'done' || current.status === 'failed' || current.status === 'cancelled') {
    const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
    console.log(`\n${current.status} in ${seconds} s${current.error ? `: ${current.error}` : ''}`);
    if (current.outputAssetId) {
      const output = await dataSource
        .getRepository(MediaAssetEntity)
        .findOneByOrFail({ id: current.outputAssetId });
      console.log(
        `output: ${output.storageKey} (${(output.size / 1e6).toFixed(1)} MB, ${output.durationSec ?? '?'} s)`,
      );
    }
    const expected =
      current.status === 'done' || (current.status === 'cancelled' && Boolean(values['cancel-after']));
    await finish(expected ? 0 : 1);
  }
};

subscriber.on('message', (_channel, raw) => {
  const event = RenderEventSchema.safeParse(JSON.parse(raw));
  if (!event.success || event.data.jobId !== job.id) return;
  if (event.data.type === 'progress') {
    process.stdout.write(`\rprogress ${String(event.data.progress).padStart(3)}%`);
  } else {
    console.log(`\nstatus ${event.data.status}${event.data.error ? ` (${event.data.error})` : ''}`);
    void report();
  }
});
// Polling fallback in case an event was missed.
setInterval(() => void report(), 3000);
