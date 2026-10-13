// End-to-end smoke test against a running stack (`make up`, then `make test-e2e`):
// generate a photo pair -> upload -> render before/after with defaults -> wait for `done`
// -> check the MP4 with ffprobe. If the fake engine is installed, its template and the
// poster-frame preview are checked too. Everything the test creates is deleted again.
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { inspectDelivery, run, type DeliveryReport } from '@vgen/media';
import {
  CreateRenderResponseSchema,
  EngineDtoSchema,
  MediaAssetDtoSchema,
  PreviewDtoSchema,
  RenderJobDtoSchema,
  type RenderJobDto,
} from '@vgen/shared';
import { z } from 'zod';

const API = `${process.env['E2E_API_URL'] ?? 'http://127.0.0.1:3000'}/api/v1`;
const RENDER_TIMEOUT_MS = 10 * 60_000;
const POLL_MS = 2000;

const created = { renders: [] as string[], media: [] as string[] };

const check = (condition: boolean, message: string): void => {
  if (!condition) throw new Error(`FAILED: ${message}`);
  console.log(`  ok  ${message}`);
};

const request = async <S extends z.ZodType>(
  schema: S,
  url: string,
  init?: RequestInit,
): Promise<z.output<S>> => {
  const response = await fetch(`${API}${url}`, init);
  const body: unknown = await response.json();
  if (!response.ok)
    throw new Error(`${init?.method ?? 'GET'} ${url} -> ${String(response.status)}: ${JSON.stringify(body)}`);
  return schema.parse(body);
};

const postJson = <S extends z.ZodType>(schema: S, url: string, body: unknown): Promise<z.output<S>> =>
  request(schema, url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

const makePhotoPair = async (dir: string): Promise<[string, string]> => {
  const before = path.join(dir, 'before.jpg');
  const after = path.join(dir, 'after.jpg');
  await run('ffmpeg', [
    '-y',
    '-f',
    'lavfi',
    '-i',
    'testsrc2=s=1600x2000',
    '-frames:v',
    '1',
    '-q:v',
    '3',
    before,
  ]);
  // Same framing, "edited" look.
  await run('ffmpeg', [
    '-y',
    '-i',
    before,
    '-vf',
    'eq=contrast=1.3:saturation=1.6:gamma=0.9',
    '-q:v',
    '3',
    after,
  ]);
  return [before, after];
};

const upload = async (files: readonly string[]): Promise<string[]> => {
  const form = new FormData();
  for (const file of files) {
    const bytes = await import('node:fs/promises').then((fs) => fs.readFile(file));
    form.append('files', new Blob([bytes], { type: 'image/jpeg' }), path.basename(file));
  }
  const assets = await request(z.array(MediaAssetDtoSchema), '/media', { method: 'POST', body: form });
  created.media.push(...assets.map((asset) => asset.id));
  return assets.map((asset) => asset.id);
};

const waitForRender = async (id: string): Promise<RenderJobDto> => {
  const deadline = Date.now() + RENDER_TIMEOUT_MS;
  let lastProgress = -1;
  for (;;) {
    const render = await request(RenderJobDtoSchema, `/renders/${id}`);
    if (render.status === 'done' || render.status === 'failed' || render.status === 'cancelled')
      return render;
    if (render.progress !== lastProgress) {
      lastProgress = render.progress;
      console.log(`  ..  ${render.status} ${String(Math.round(render.progress))}%`);
    }
    if (Date.now() > deadline) throw new Error(`render ${id} did not finish in time`);
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
};

const renderAndInspect = async (
  templateId: string,
  props: Record<string, unknown>,
  dir: string,
): Promise<DeliveryReport> => {
  const job = await postJson(CreateRenderResponseSchema, '/renders', { templateId, props });
  created.renders.push(job.id);
  console.log(`  ..  queued ${job.outputName}`);
  const render = await waitForRender(job.id);
  check(
    render.status === 'done',
    `${templateId}: render finished (${render.status}${render.error ? `: ${render.error}` : ''})`,
  );
  check(render.thumbnail !== null, `${templateId}: has a preview frame`);
  const url = render.output?.url;
  if (!url) throw new Error('render has no output');
  const file = path.join(dir, `${templateId}.mp4`);
  const response = await fetch(`${API}${url.replace('/api/v1', '')}`);
  await writeFile(file, Buffer.from(await response.arrayBuffer()));
  return inspectDelivery(file);
};

const checkDelivery = (
  label: string,
  report: DeliveryReport,
  size: [number, number],
  durationSec: number,
): void => {
  check(report.videoCodec === 'h264' && report.pixelFormat === 'yuv420p', `${label}: h264 / yuv420p`);
  check(
    report.width === size[0] && report.height === size[1],
    `${label}: ${String(size[0])}×${String(size[1])}`,
  );
  check(
    Math.abs((report.durationSec ?? 0) - durationSec) < 0.15,
    `${label}: ${String(durationSec)} s (${String(report.durationSec)})`,
  );
  check(report.audioCodec === 'aac' && report.audioSampleRate === 48000, `${label}: AAC 48 kHz`);
  check(report.faststart, `${label}: faststart (moov first)`);
};

const cleanup = async (): Promise<void> => {
  for (const id of created.renders) await fetch(`${API}/renders/${id}`, { method: 'DELETE' });
  for (const id of created.media) await fetch(`${API}/media/${id}`, { method: 'DELETE' });
};

const dir = await mkdtemp(path.join(tmpdir(), 'vgen-e2e-'));
const started = Date.now();
try {
  console.log(`e2e against ${API}`);
  const engines = await request(z.array(EngineDtoSchema), '/engines');
  const [before, after] = await upload(await makePhotoPair(dir));
  if (!before || !after) throw new Error('upload returned no assets');

  console.log('before/after with defaults:');
  checkDelivery(
    'before-after',
    await renderAndInspect('before-after', { media: { before, after } }, dir),
    [1080, 1920],
    13,
  );

  if (!engines.some((engine) => engine.id === 'fake')) {
    console.log('fake engine: hidden, second-engine checks skipped (make fake-on to include them)');
  } else {
    console.log('fake engine (test-card):');
    checkDelivery(
      'test-card',
      await renderAndInspect('test-card', { media: { photo: after }, format: '1:1' }, dir),
      [1080, 1080],
      4,
    );
    const preview = await postJson(PreviewDtoSchema, '/previews', {
      templateId: 'test-card',
      props: { media: { photo: after } },
    });
    const frame = await fetch(`${API}${preview.url.replace('/api/v1', '')}`);
    check(
      frame.ok && frame.headers.get('content-type') === 'image/jpeg',
      'test-card: poster-frame preview (no browser player)',
    );
  }
  console.log(`e2e passed in ${String(Math.round((Date.now() - started) / 1000))} s`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await cleanup();
  await rm(dir, { recursive: true, force: true });
}
