import type React from 'react';
import { fontFamily } from '../fonts.js';
import type { Layout } from '../layout.js';
import { ease, type EasingFn } from '../motion.js';
import { SUBPIXEL_TEXT_TRANSFORM } from '../placement.js';
import { parseAccentText } from '../typography/accent-text.js';
import type { TitleEntrance, TitlePosition, TitleShadow, TitleStyle } from './fields.js';
import { InstagramTitle, type InstagramTitleSetup } from './InstagramTitle.js';
import {
  entranceAt,
  entranceMotion,
  textShadow,
  titleAnchor,
  titleBlockStyle,
  type TopAt,
} from './title-block.js';

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
  /** Another place at the top of the frame than `TOP_AT`. */
  readonly topAt?: TopAt;
  /** Opacity of the `rise` entrance, `ease.outCubic` by default. */
  readonly riseFade?: EasingFn;
}

export interface TitleColors {
  readonly text: string;
  readonly accent: string;
  readonly accentFont: string;
  /** The template's heading font (the `reel` look). */
  readonly heading?: string;
}

/** Owner-tunable layout of the block (design px at 1080 on the short side). */
export interface TitleSetup {
  readonly position: TitlePosition;
  /** Moves the block down (negative: up), px. */
  readonly offsetY: number;
  /** Extra space above the main line (under the kicker) and above the last line, px. */
  readonly kickerGap: number;
  readonly lineGap: number;
  /** Weight of the last line's plain words (the reference's "For the"). */
  readonly tailWeight: number;
  readonly shadow: TitleShadow;
}

const REEL_TOP_AT = { portrait: 0.155, landscape: 0.1 } as const;

const reelLook = (u: number, unit: number, colors: TitleColors, setup: TitleSetup): Look => {
  const heading = colors.heading ?? fontFamily('montserrat');
  const shadow = textShadow(setup.shadow, unit);
  const accent: React.CSSProperties = {
    fontFamily: colors.accentFont,
    fontWeight: 700,
    fontStyle: 'normal',
    letterSpacing: '0.05em',
    marginLeft: '0.3em',
    color: colors.accent,
  };
  return {
    lines: {
      kicker: {
        text: {
          fontFamily: heading,
          fontWeight: 300,
          fontStyle: 'italic',
          fontSize: 61 * u,
          lineHeight: 1.18,
          color: colors.accent,
          textShadow: shadow,
        },
        accent,
      },
      hero: {
        text: {
          fontFamily: heading,
          fontWeight: 900,
          fontStyle: 'italic',
          fontSize: 97 * u,
          lineHeight: 0.92,
          letterSpacing: '-0.01em',
          color: colors.text,
          textShadow: shadow,
        },
        accent,
      },
      tail: {
        text: {
          fontFamily: heading,
          fontWeight: setup.tailWeight,
          fontSize: 68 * u,
          lineHeight: 1.5,
          color: colors.text,
          textShadow: shadow,
        },
        accent,
      },
    },
    gap: 0,
    topAt: REEL_TOP_AT,
    riseFade: ease.outQuint,
  };
};

/**
 * Design sizes at 1080 px on the short side. `classic` follows references/4: a bold yellow
 * kicker, a black italic hero line, a light italic tail with a script accent word.
 */
const looks = (
  u: number,
  unit: number,
  colors: TitleColors,
  setup: TitleSetup,
): Readonly<Record<Exclude<TitleStyle, 'instagram'>, Look>> => {
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
    // preset-reel's original look (references/2): the shadow keeps its size at any title size.
    reel: reelLook(u, unit, colors, setup),
  };
};

export interface StyledTitleProps {
  readonly frame: number;
  readonly fps: number;
  readonly layout: Layout;
  readonly style: TitleStyle;
  readonly entrance: TitleEntrance;
  readonly size: number;
  readonly colors: TitleColors;
  readonly setup: TitleSetup;
  readonly lines: Readonly<Record<LineKey, string | null>>;
  /** 0..1 exit of the whole block (fades and grows slightly); without it the block never leaves. */
  readonly exit?: number;
  /** The `instagram` style's text and look (that style draws nothing without it). */
  readonly instagram?: InstagramTitleSetup;
}

/**
 * A title over a clip: three lines (kicker, hero, tail with an `*accent*`) in one of several
 * looks. Settings: `fields.ts`.
 */
export const StyledTitle: React.FC<StyledTitleProps> = ({
  frame,
  fps,
  layout,
  style,
  entrance,
  size,
  colors,
  setup,
  lines,
  exit,
  instagram,
}) => {
  if (style === 'instagram') {
    return instagram ? (
      <InstagramTitle
        frame={frame}
        fps={fps}
        layout={layout}
        entrance={entrance}
        size={size}
        setup={setup}
        look={instagram}
        exit={exit}
      />
    ) : null;
  }
  const u = layout.unit * size;
  const look = looks(u, layout.unit, colors, setup)[style];
  const shown = (['kicker', 'hero', 'tail'] as const).flatMap((key) => {
    const text = lines[key];
    return text && text.trim().length > 0 ? [{ key, text }] : [];
  });
  if (shown.length === 0 || (exit ?? 0) >= 1) return null;

  const anchor = titleAnchor(layout, setup, look.topAt);
  const gapAbove = (key: LineKey, index: number): number =>
    index === 0 ? 0 : (key === 'hero' ? setup.kickerGap : key === 'tail' ? setup.lineGap : 0) * u;

  return (
    <div
      style={{
        ...titleBlockStyle(layout, anchor, exit),
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
        const motion = entranceMotion(entrance, entranceAt(entrance, frame, fps, index), look.riseFade);
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
