import type React from 'react';
import { fontFamily } from '../../core/fonts.js';
import type { Layout } from '../../core/layout.js';
import { cubicBezier, ease, progress } from '../../core/motion.js';
import { placeAt, SUBPIXEL_TEXT_TRANSFORM } from '../../core/placement.js';
import { parseAccentText } from '../../core/typography/accent-text.js';
import type { PresetFlipProps } from './manifest.js';
import { TIMING } from './timeline.js';

type TitleStyle = PresetFlipProps['params']['titleStyle'];
type LineKey = 'kicker' | 'hero' | 'tail';

interface LineLook {
  readonly text: React.CSSProperties;
  readonly accent: React.CSSProperties;
  /** Box around the line (stickers). */
  readonly box?: React.CSSProperties;
  readonly upper?: boolean;
}

interface Look {
  readonly lines: Readonly<Record<LineKey, LineLook>>;
  /** Box around the whole block (plate). */
  readonly block?: React.CSSProperties;
  readonly gap: number;
}

export interface TitleColors {
  readonly text: string;
  readonly accent: string;
  readonly accentFont: string;
}

type Params = PresetFlipProps['params'];

/** Owner-tunable layout of the block (design px at 1080 on the short side). */
export interface TitleSetup {
  readonly position: Params['titlePosition'];
  /** Moves the block down (negative: up), px. */
  readonly offsetY: number;
  /** Extra space above the main line (under the kicker) and above the last line, px. */
  readonly kickerGap: number;
  readonly lineGap: number;
  /** Weight of the last line's plain words (the reference's "For the"). */
  readonly tailWeight: number;
  readonly shadow: Params['titleShadow'];
}

/** CSS text shadow of the block (none at zero opacity). */
const textShadow = (shadow: TitleSetup['shadow'], u: number): string | undefined =>
  shadow.opacity > 0
    ? `${(shadow.x * u).toFixed(2)}px ${(shadow.y * u).toFixed(2)}px ${(shadow.blur * u).toFixed(2)}px rgba(0,0,0,${shadow.opacity.toFixed(3)})`
    : undefined;

const POP_EASE = cubicBezier(0.34, 1.56, 0.64, 1);

/**
 * Design sizes at 1080 px on the short side. `classic` follows references/4: a bold yellow
 * kicker, a black italic hero line, a light italic tail with a script accent word.
 */
const looks = (u: number, colors: TitleColors, setup: TitleSetup): Readonly<Record<TitleStyle, Look>> => {
  const montserrat = fontFamily('montserrat');
  const shadow = textShadow(setup.shadow, u);
  const script = (size: number, color: string): React.CSSProperties => ({
    fontFamily: colors.accentFont,
    fontStyle: 'normal',
    fontWeight: 400,
    fontSize: size * u,
    color,
    // A touch heavier than the face itself, as in the reference.
    WebkitTextStroke: `${(size * 0.022 * u).toFixed(2)}px ${color}`,
    marginLeft: '0.22em',
  });
  const classicLines: Record<LineKey, LineLook> = {
    kicker: {
      text: {
        fontFamily: montserrat,
        fontWeight: 800,
        fontSize: 76 * u,
        lineHeight: 1.2,
        color: colors.accent,
      },
      accent: { color: colors.text },
    },
    hero: {
      text: {
        fontFamily: montserrat,
        fontWeight: 900,
        fontStyle: 'italic',
        fontSize: 121 * u,
        lineHeight: 1,
        letterSpacing: '-0.01em',
        color: colors.text,
      },
      accent: { color: colors.accent },
    },
    tail: {
      text: {
        fontFamily: montserrat,
        fontWeight: setup.tailWeight,
        fontStyle: 'italic',
        fontSize: 89 * u,
        lineHeight: 1.12,
        color: colors.text,
      },
      accent: script(114, colors.accent),
    },
  };
  return {
    classic: {
      lines: {
        kicker: { ...classicLines.kicker, text: { ...classicLines.kicker.text, textShadow: shadow } },
        hero: { ...classicLines.hero, text: { ...classicLines.hero.text, textShadow: shadow } },
        tail: { ...classicLines.tail, text: { ...classicLines.tail.text, textShadow: shadow } },
      },
      gap: 0,
    },
    plate: {
      lines: classicLines,
      block: {
        padding: `${34 * u}px ${58 * u}px ${30 * u}px`,
        borderRadius: 34 * u,
        background: 'rgba(12, 12, 14, 0.62)',
        boxShadow: `0 ${16 * u}px ${48 * u}px rgba(0,0,0,0.3)`,
      },
      gap: 0,
    },
    sticker: {
      lines: {
        kicker: {
          text: {
            fontFamily: montserrat,
            fontWeight: 800,
            fontSize: 46 * u,
            lineHeight: 1.25,
            color: '#111111',
          },
          accent: {},
          box: { background: colors.accent, padding: `${6 * u}px ${22 * u}px`, transform: 'rotate(-3deg)' },
          upper: true,
        },
        hero: {
          text: {
            fontFamily: montserrat,
            fontWeight: 900,
            fontStyle: 'italic',
            fontSize: 104 * u,
            lineHeight: 1.08,
            letterSpacing: '-0.01em',
            color: '#111111',
          },
          accent: { color: colors.accent },
          box: { background: colors.text, padding: `${4 * u}px ${30 * u}px`, transform: 'rotate(1.6deg)' },
        },
        tail: {
          text: {
            fontFamily: montserrat,
            fontWeight: Math.max(setup.tailWeight, 500),
            fontStyle: 'italic',
            fontSize: 66 * u,
            lineHeight: 1.3,
            color: colors.text,
          },
          accent: script(92, colors.accent),
          box: { background: '#111111', padding: `${4 * u}px ${30 * u}px`, transform: 'rotate(-1.4deg)' },
        },
      },
      gap: 14 * u,
    },
    stack: {
      lines: {
        kicker: {
          text: {
            fontFamily: montserrat,
            fontWeight: 700,
            fontSize: 38 * u,
            lineHeight: 1.6,
            letterSpacing: '0.38em',
            marginRight: '-0.38em',
            color: colors.accent,
            textShadow: shadow,
          },
          accent: { color: colors.text },
          upper: true,
        },
        hero: {
          text: {
            fontFamily: fontFamily('bebas-neue'),
            fontSize: 220 * u,
            lineHeight: 0.86,
            color: colors.text,
            textShadow: shadow,
          },
          accent: { color: colors.accent },
          upper: true,
        },
        tail: {
          text: {
            fontFamily: fontFamily('bebas-neue'),
            fontSize: 124 * u,
            lineHeight: 0.95,
            color: 'transparent',
            WebkitTextStroke: `${3 * u}px ${colors.text}`,
          },
          accent: { color: colors.accent, WebkitTextStroke: '0px transparent', textShadow: shadow },
          upper: true,
        },
      },
      gap: 0,
    },
    editorial: {
      lines: {
        kicker: {
          text: {
            fontFamily: montserrat,
            fontWeight: 600,
            fontSize: 34 * u,
            lineHeight: 1.9,
            letterSpacing: '0.32em',
            marginRight: '-0.32em',
            color: colors.accent,
            textShadow: shadow,
          },
          accent: { color: colors.text },
          upper: true,
        },
        hero: {
          text: {
            fontFamily: fontFamily('playfair-display'),
            fontWeight: 800,
            fontSize: 124 * u,
            lineHeight: 1.02,
            color: colors.text,
            textShadow: shadow,
          },
          accent: { color: colors.accent },
        },
        tail: {
          text: {
            fontFamily: fontFamily('playfair-display'),
            fontWeight: Math.max(setup.tailWeight, 400),
            fontSize: 72 * u,
            lineHeight: 1.2,
            color: colors.text,
            textShadow: shadow,
          },
          accent: script(100, colors.accent),
        },
      },
      gap: 0,
    },
  };
};

export interface FlipTitleProps {
  readonly frame: number;
  readonly fps: number;
  readonly layout: Layout;
  readonly style: TitleStyle;
  readonly entrance: PresetFlipProps['params']['titleEntrance'];
  readonly size: number;
  readonly colors: TitleColors;
  readonly setup: TitleSetup;
  readonly lines: Readonly<Record<LineKey, string | null>>;
}

/**
 * The POV title over the clip: three lines (kicker, hero, tail with an `*accent*`) in one of
 * several looks. Stays in place while the clip zooms away (it is not part of the zoom).
 */
export const FlipTitle: React.FC<FlipTitleProps> = ({
  frame,
  fps,
  layout,
  style,
  entrance,
  size,
  colors,
  setup,
  lines,
}) => {
  const u = layout.unit * size;
  const look = looks(u, colors, setup)[style];
  const shown = (['kicker', 'hero', 'tail'] as const).flatMap((key) => {
    const text = lines[key];
    return text && text.trim().length > 0 ? [{ key, text }] : [];
  });
  if (shown.length === 0) return null;

  // Top: the reference's place; centre and bottom anchor the block's middle / bottom edge.
  const offset = setup.offsetY * layout.unit;
  const anchor =
    setup.position === 'top'
      ? {
          y: Math.max(layout.safe.top, layout.height * (layout.orientation === 'portrait' ? 0.122 : 0.08)),
          shift: '0%',
        }
      : setup.position === 'center'
        ? { y: layout.height / 2, shift: '-50%' }
        : { y: layout.height - Math.max(layout.safe.bottom, layout.height * 0.08), shift: '-100%' };
  const gapAbove = (key: LineKey, index: number): number =>
    index === 0 ? 0 : (key === 'hero' ? setup.kickerGap : key === 'tail' ? setup.lineGap : 0) * u;
  const enterOf = (index: number): number =>
    entrance === 'none'
      ? 1
      : progress(
          frame,
          Math.round((TIMING.titleIn + index * TIMING.titleStagger) * fps),
          Math.round(TIMING.titleLine * fps),
        );

  return (
    <div
      style={{
        ...placeAt(layout.width / 2, anchor.y + offset, { transform: `translate(-50%, ${anchor.shift})` }),
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: look.gap,
        whiteSpace: 'nowrap',
        ...look.block,
      }}
    >
      {shown.map(({ key, text }, index) => {
        const line = look.lines[key];
        const t = enterOf(index);
        const motion =
          entrance === 'rise'
            ? {
                opacity: ease.outCubic(t),
                transform: `translateY(${((1 - ease.outQuint(t)) * 0.45).toFixed(4)}em)`,
              }
            : entrance === 'pop'
              ? {
                  opacity: Math.min(1, t * 3),
                  transform: `scale(${(0.6 + 0.4 * POP_EASE(t)).toFixed(4)})`,
                }
              : {};
        return (
          <div key={key} style={{ ...line.text, marginTop: gapAbove(key, index), ...motion }}>
            <div
              style={{
                ...line.box,
                transform: `${String(line.box?.transform ?? '')} ${SUBPIXEL_TEXT_TRANSFORM}`,
              }}
            >
              {parseAccentText(line.upper ? text.toUpperCase() : text).map((run, runIndex) => (
                <span key={runIndex} style={run.accent ? line.accent : undefined}>
                  {run.text}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
