import type { ValueTransformer } from 'typeorm';

/** Postgres returns bigint/numeric as strings; we keep numbers in the domain. */
export const numericTransformer: ValueTransformer = {
  to: (value: number | null | undefined) => value,
  from: (value: string | null) => (value === null ? null : Number(value)),
};
