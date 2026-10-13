import { describe, expect, it, vi } from 'vitest';
import { createBundleManager } from './bundle-manager.js';

vi.mock('node:fs/promises', () => ({ rm: vi.fn(() => Promise.resolve()) }));

const tick = (ms = 5): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const deferred = () => {
  let resolve: () => void = () => undefined;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

const setup = (builds: (() => Promise<string>)[]) => {
  let index = 0;
  const build = vi.fn(() => (builds[index++] ?? (() => Promise.reject(new Error('no build'))))());
  const manager = createBundleManager({ build, debounceMs: 1 });
  return { manager, build };
};

describe('bundle manager (dev rebuilds)', () => {
  it('never rebuilds during a render: the running render keeps its bundle, the next one gets the new', async () => {
    const { manager, build } = setup([() => Promise.resolve('b1'), () => Promise.resolve('b2')]);
    await manager.start();
    const render = deferred();
    const seen: string[] = [];
    const running = manager.use(async (url) => {
      seen.push(url);
      await render.promise;
    });
    manager.invalidate();
    await tick(20);
    expect(build).toHaveBeenCalledTimes(1); // still rendering: no rebuild yet
    render.resolve();
    await running;
    await tick(); // rebuild starts once idle
    await manager.use((url) => Promise.resolve(seen.push(url)));
    expect(seen).toEqual(['b1', 'b2']);
    expect(build).toHaveBeenCalledTimes(2);
  });

  it('tasks wait for a rebuild in progress; a failed build keeps the previous bundle', async () => {
    const slow = deferred();
    const { manager } = setup([
      () => Promise.resolve('b1'),
      async () => {
        await slow.promise;
        return 'b2';
      },
      () => Promise.reject(new Error('syntax error')),
    ]);
    await manager.start();
    manager.invalidate();
    await tick();
    const waiting = manager.use((url) => Promise.resolve(url));
    slow.resolve();
    await expect(waiting).resolves.toBe('b2');

    manager.invalidate();
    await tick();
    await expect(manager.use((url) => Promise.resolve(url))).resolves.toBe('b2');
  });

  it('debounces bursts of changes into one rebuild', async () => {
    const { manager, build } = setup([() => Promise.resolve('b1'), () => Promise.resolve('b2')]);
    await manager.start();
    for (let i = 0; i < 5; i += 1) manager.invalidate();
    await tick(20);
    expect(build).toHaveBeenCalledTimes(2);
  });
});
