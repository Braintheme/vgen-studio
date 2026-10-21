import { once } from 'node:events';
import type { Readable, Writable } from 'node:stream';
import { Zip, ZipPassThrough } from 'fflate';

export interface ZipEntry {
  readonly name: string;
  readonly open: () => Promise<Readable>;
}

/**
 * Streams a ZIP of `entries` into `out` without buffering whole files. Entries are stored,
 * not deflated: the payloads are JPEGs, compression would only cost time. Honours
 * backpressure, so a slow client does not pile the archive up in memory.
 */
export const writeZip = async (entries: readonly ZipEntry[], out: Writable): Promise<void> => {
  // Set from the callback; an object keeps TypeScript from narrowing it to `null`.
  const state: { failure: Error | null } = { failure: null };
  const zip = new Zip((error, chunk, final) => {
    if (error) {
      state.failure = error;
      return;
    }
    out.write(chunk);
    if (final) out.end();
  });
  const drained = async (): Promise<void> => {
    if (out.writableNeedDrain) await once(out, 'drain');
  };
  for (const entry of entries) {
    const file = new ZipPassThrough(entry.name);
    zip.add(file);
    const stream = await entry.open();
    for await (const chunk of stream) {
      file.push(chunk as Uint8Array);
      if (state.failure) throw state.failure;
      await drained();
    }
    file.push(new Uint8Array(0), true);
  }
  zip.end();
  if (state.failure) throw state.failure;
};
