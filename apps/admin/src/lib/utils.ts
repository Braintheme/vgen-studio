import type { ClassValue } from 'clsx';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Deep copy of JSON-compatible data (also detaches Vue reactive proxies). */
export const cloneJson = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/** Value at a dot path of nested plain data (`music.trackId`), or undefined. */
export const valueAtPath = (data: unknown, path: string): unknown =>
  path
    .split('.')
    .reduce<unknown>(
      (node, key) =>
        typeof node === 'object' && node !== null ? (node as Record<string, unknown>)[key] : undefined,
      data,
    );
