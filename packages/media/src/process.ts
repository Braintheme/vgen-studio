import { spawn } from 'node:child_process';

export class ProcessError extends Error {
  constructor(
    readonly command: string,
    readonly exitCode: number | null,
    readonly stderr: string,
  ) {
    super(
      `${command} exited with code ${exitCode ?? 'null'}: ${stderr.trim().split('\n').slice(-3).join(' | ')}`,
    );
  }
}

/** Runs a binary, collecting stdout/stderr; aborts it when `signal` fires. */
export const run = (
  command: string,
  args: readonly string[],
  options: { signal?: AbortSignal } = {},
): Promise<{ stdout: string; stderr: string }> =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'], signal: options.signal });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk: Buffer) => (stdout += chunk.toString()));
    child.stderr.on('data', (chunk: Buffer) => (stderr += chunk.toString()));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new ProcessError(command, code, stderr));
    });
  });
