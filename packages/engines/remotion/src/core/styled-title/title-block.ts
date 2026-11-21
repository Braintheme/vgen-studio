// Placement, entrance and exit of a title block, shared by the title looks. Isomorphic.
import type React from 'react';
import type { Layout } from '../layout.js';
import { cubicBezier, ease, progress, type EasingFn } from '../motion.js';
import { placeAt } from '../placement.js';
import type { TitleEntrance, TitlePosition, TitleShadow } from './fields.js';

/** Entrance, seconds: the first line starts, each line takes this long, the next follows. */
const ENTRANCE = { start: 0.15, line: 0.6, stagger: 0.09 } as const;
const TOP_AT = { portrait: 0.122, landscape: 0.08 } as const;
const POP_EASE = cubicBezier(0.34, 1.56, 0.64, 1);

/** CSS text shadow of the block (none at zero opacity). */
export const textShadow = (shadow: TitleShadow, u: number): string | undefined =>
  shadow.opacity > 0
    ? `${(shadow.x * u).toFixed(2)}px ${(shadow.y * u).toFixed(2)}px ${(shadow.blur * u).toFixed(2)}px rgba(0,0,0,${shadow.opacity.toFixed(3)})`
    : undefined;

/** The block's top when placed at the top, as a share of the frame's height. */
export interface TopAt {
  readonly portrait: number;
  readonly landscape: number;
}

/**
 * Where the block sits: the y of its anchor (offset included) and how the block hangs from it
 * (top: below, centre: around, bottom: above).
 */
export const titleAnchor = (
  layout: Layout,
  setup: { readonly position: TitlePosition; readonly offsetY: number },
  topAt: TopAt = TOP_AT,
): { readonly y: number; readonly shift: string } => {
  // Top: the reference's place; centre and bottom anchor the block's middle / bottom edge.
  const offset = setup.offsetY * layout.unit;
  const anchor =
    setup.position === 'top'
      ? {
          y: Math.max(
            layout.safe.top,
            layout.height * (layout.orientation === 'portrait' ? topAt.portrait : topAt.landscape),
          ),
          shift: '0%',
        }
      : setup.position === 'center'
        ? { y: layout.height / 2, shift: '-50%' }
        : { y: layout.height - Math.max(layout.safe.bottom, layout.height * 0.08), shift: '-100%' };
  return { y: anchor.y + offset, shift: anchor.shift };
};

/** 0..1 entrance of the `index`-th line (1 at once without an entrance). */
export const entranceAt = (entrance: TitleEntrance, frame: number, fps: number, index: number): number =>
  entrance === 'none'
    ? 1
    : progress(
        frame,
        Math.round((ENTRANCE.start + index * ENTRANCE.stagger) * fps),
        Math.round(ENTRANCE.line * fps),
      );

/** Opacity and transform of a line (or a whole block) entering at `t`. */
export const entranceMotion = (
  entrance: TitleEntrance,
  t: number,
  riseFade: EasingFn = ease.outCubic,
): React.CSSProperties =>
  entrance === 'rise'
    ? {
        opacity: riseFade(t),
        transform: `translateY(${((1 - ease.outQuint(t)) * 0.45).toFixed(4)}em)`,
      }
    : entrance === 'pop'
      ? {
          opacity: Math.min(1, t * 3),
          transform: `scale(${(0.6 + 0.4 * POP_EASE(t)).toFixed(4)})`,
        }
      : {};

/** The block's placement, with the template's exit (fades and grows slightly). */
export const titleBlockStyle = (
  layout: Layout,
  anchor: { readonly y: number; readonly shift: string },
  exit: number | undefined,
): React.CSSProperties => ({
  ...placeAt(layout.width / 2, anchor.y, {
    transform: `translate(-50%, ${anchor.shift})${exit === undefined ? '' : ` scale(${(1 + 0.06 * exit).toFixed(4)})`}`,
  }),
  // A block that scales on exit: no `will-change` (it would freeze the raster scale).
  ...(exit === undefined ? {} : { willChange: 'auto', transformOrigin: '50% 40%', opacity: 1 - exit }),
});
