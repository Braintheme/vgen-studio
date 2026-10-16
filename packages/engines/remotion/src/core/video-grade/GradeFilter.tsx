import type React from 'react';
import { useId, useMemo } from 'react';
import { gradeFilter } from './filter.js';
import type { VideoGrade } from './schema.js';

export interface GradeFilterState {
  /** Hidden SVG holding the filter (render it next to the graded element). */
  readonly defs: React.ReactNode;
  /** CSS `filter` for the graded element, or undefined for a neutral grade. */
  readonly filter: string | undefined;
}

const CHANNELS = ['feFuncR', 'feFuncG', 'feFuncB'] as const;

/**
 * The clip grade as an SVG filter (tone tables + colour matrix). Neutral grades produce no
 * filter and no markup, so ungraded clips render exactly as before.
 */
export const useGradeFilter = (grade: VideoGrade | undefined): GradeFilterState => {
  const id = `vgen-grade-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const spec = useMemo(() => (grade ? gradeFilter(grade) : null), [grade]);
  if (!spec) return { defs: null, filter: undefined };
  const defs = (
    <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden>
      <filter id={id} colorInterpolationFilters="sRGB" x="0" y="0" width="100%" height="100%">
        <feComponentTransfer>
          {CHANNELS.map((Func, channel) => (
            <Func key={Func} type="table" tableValues={spec.tables[channel]?.join(' ')} />
          ))}
        </feComponentTransfer>
        <feColorMatrix type="matrix" values={spec.matrix.join(' ')} />
      </filter>
    </svg>
  );
  return { defs, filter: `url(#${id})` };
};
