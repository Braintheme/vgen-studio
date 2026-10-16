// Opens admin pages in headless Chrome and fails on uncaught exceptions or console errors:
// runtime problems lint and unit tests cannot see (e.g. a component used outside its context).
// Usage: pnpm --filter @vgen/engine-remotion admin-check [--path=/media] [--click="Clean up unused"]
//        (no --path: every main page plus the compose screen of every template)
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { parseArgs } from 'node:util';
import { ensureRemotionBrowser } from '../src/server/browser.js';

const { values } = parseArgs({
  options: {
    path: { type: 'string' },
    click: { type: 'string' },
    wait: { type: 'string', default: '12000' },
    admin: { type: 'string', default: process.env['ADMIN_URL'] ?? 'http://admin:5173' },
    api: { type: 'string', default: process.env['API_URL'] ?? 'http://api:3000/api/v1' },
  },
});
const PORT = 9333;
const MAIN_PAGES = ['/templates', '/renders', '/media', '/music', '/presets'];

interface CdpMessage {
  readonly id?: number;
  readonly method?: string;
  readonly params?: Record<string, unknown>;
  readonly result?: Record<string, unknown>;
}

/** A CDP remote object (or plain value) as text. */
const describe = (value: unknown): string => {
  if (typeof value !== 'object' || value === null)
    return typeof value === 'string' ? value : JSON.stringify(value);
  const remote = value as { description?: unknown; value?: unknown };
  if (typeof remote.description === 'string') return remote.description;
  return typeof remote.value === 'string' ? remote.value : JSON.stringify(remote.value ?? null);
};

const pagesToCheck = async (): Promise<string[]> => {
  if (values.path) return [values.path];
  const templates = (await fetch(`${values.api}/templates`).then((response) => response.json())) as {
    id: string;
  }[];
  return [...MAIN_PAGES, ...templates.map((template) => `/compose/${template.id}`)];
};

const executable = await ensureRemotionBrowser();
const chrome = spawn(
  executable,
  ['--no-sandbox', '--no-zygote', '--disable-gpu', `--remote-debugging-port=${String(PORT)}`, 'about:blank'],
  { stdio: 'ignore' },
);

let failures = 0;
try {
  let targets: { type: string; webSocketDebuggerUrl: string }[] = [];
  for (let attempt = 0; attempt < 50 && targets.length === 0; attempt += 1) {
    await sleep(200);
    targets = await fetch(`http://127.0.0.1:${String(PORT)}/json/list`)
      .then((response) => response.json() as Promise<typeof targets>)
      .catch(() => []);
  }
  const page = targets.find((target) => target.type === 'page');
  if (!page) throw new Error('Chrome did not start');
  const socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve) => {
    socket.addEventListener('open', resolve, { once: true });
  });
  let nextId = 0;
  const pending = new Map<number, (result: Record<string, unknown>) => void>();
  let problems: string[] = [];
  socket.addEventListener('message', (event: MessageEvent<string>) => {
    const message = JSON.parse(event.data) as CdpMessage;
    if (message.id !== undefined) {
      pending.get(message.id)?.(message.result ?? {});
      pending.delete(message.id);
    }
    if (message.method === 'Runtime.exceptionThrown') {
      const details = message.params?.['exceptionDetails'] as
        { exception?: unknown; text?: string } | undefined;
      problems.push(
        `exception: ${(details?.exception ? describe(details.exception) : (details?.text ?? '')).split('\n')[0] ?? ''}`,
      );
    }
    if (message.method === 'Runtime.consoleAPICalled' && message.params?.['type'] === 'error') {
      const args = (message.params['args'] as unknown[] | undefined) ?? [];
      problems.push(`console.error: ${args.map(describe).join(' ').split('\n')[0] ?? ''}`);
    }
  });
  const send = (method: string, params: Record<string, unknown> = {}): Promise<Record<string, unknown>> =>
    new Promise((resolve) => {
      nextId += 1;
      pending.set(nextId, resolve);
      socket.send(JSON.stringify({ id: nextId, method, params }));
    });
  await send('Runtime.enable');
  await send('Page.enable');

  for (const path of await pagesToCheck()) {
    problems = [];
    await send('Page.navigate', { url: `${values.admin}${path}` });
    await sleep(Number(values.wait));
    if (values.click) {
      await send('Runtime.evaluate', {
        expression: `[...document.querySelectorAll('button')].find((b) => b.textContent.includes(${JSON.stringify(values.click)}))?.click()`,
      });
      await sleep(3000);
    }
    if (problems.length > 0) failures += 1;
    console.log(
      `${problems.length > 0 ? '✗' : '✓'} ${path}${values.click ? ` (click "${values.click}")` : ''}`,
    );
    problems.forEach((problem) => {
      console.log(`    ${problem}`);
    });
  }
  socket.close();
} finally {
  chrome.kill();
}
if (failures > 0) {
  console.error(`admin-check: ${String(failures)} page(s) with errors`);
  process.exit(1);
}
console.log('admin-check: no errors');
