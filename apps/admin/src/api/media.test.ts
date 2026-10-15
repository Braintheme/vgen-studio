import { MAX_UPLOAD_FILES_PER_REQUEST } from '@vgen/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mediaApi } from './media';

const { postJson } = vi.hoisted(() => ({ postJson: vi.fn() }));
vi.mock('./http', () => ({ postJson, getJson: vi.fn(), deleteResource: vi.fn() }));

const file = (name: string): File => new File(['x'.repeat(10)], name, { type: 'image/png' });

describe('mediaApi.upload', () => {
  beforeEach(() => {
    postJson.mockReset();
    // Echo one asset per uploaded file, named after it.
    postJson.mockImplementation((_schema: unknown, _url: string, form: FormData) =>
      Promise.resolve(form.getAll('files').map((entry) => ({ id: (entry as File).name }))),
    );
  });

  it('sends a large selection in batches the API accepts and keeps the file order', async () => {
    const files = Array.from({ length: 13 }, (_, index) =>
      file(`shot-${String(index).padStart(2, '0')}.png`),
    );
    const assets = await mediaApi.upload(files);
    expect(postJson).toHaveBeenCalledTimes(Math.ceil(13 / MAX_UPLOAD_FILES_PER_REQUEST));
    for (const [, , form] of postJson.mock.calls as [unknown, unknown, FormData][]) {
      expect(form.getAll('files').length).toBeLessThanOrEqual(MAX_UPLOAD_FILES_PER_REQUEST);
    }
    expect(assets.map((asset) => asset.id)).toEqual(files.map((f) => f.name));
  });

  it('reports progress over all batches', async () => {
    postJson.mockImplementation(
      (
        _schema: unknown,
        _url: string,
        form: FormData,
        config: { onUploadProgress: (event: { loaded: number }) => void },
      ) => {
        const entries = form.getAll('files') as File[];
        config.onUploadProgress({ loaded: entries.reduce((sum, entry) => sum + entry.size, 0) });
        return Promise.resolve(entries.map((entry) => ({ id: entry.name })));
      },
    );
    const progress: number[] = [];
    await mediaApi.upload(
      Array.from({ length: 12 }, (_, index) => file(`f${String(index)}.png`)),
      { onProgress: (fraction) => progress.push(fraction) },
    );
    expect(progress.at(-1)).toBe(1);
    expect(progress[0]).toBeLessThan(1);
    expect([...progress].sort((a, b) => a - b)).toEqual(progress);
  });
});
