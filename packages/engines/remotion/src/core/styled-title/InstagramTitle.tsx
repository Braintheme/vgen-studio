import type { FontId } from '@vgen/shared';
import { measureText } from '@remotion/layout-utils';
import type React from 'react';
import { useMemo } from 'react';
import { fontFamily, useFonts } from '../fonts.js';
import type { Layout } from '../layout.js';
import { SUBPIXEL_TEXT_TRANSFORM } from '../placement.js';
import type { TitleEntrance, TitlePosition, TitleShadow } from './fields.js';
import type { TitleAlign, TitleFill } from './instagram-fields.js';
import { fitScale, plateCorners, plateRuns, roundedPath, type PlateRow } from './plate.js';
import { entranceAt, entranceMotion, textShadow, titleAnchor, titleBlockStyle } from './title-block.js';

/** Design values at 1080 px on the short side; spacing as a share of the font size. */
const DESIGN = {
  fontSize: 72,
  /** Row height: the lines' fills touch, as in Instagram. */
  row: 1.3,
  padX: 0.32,
  radius: 0.3,
  /** Edges of neighbouring lines closer than this line up (no hairline steps). */
  snap: 0.35,
  seeThrough: 0.55,
} as const;

/** The `instagram` look: free text, its colours, background and outline. */
export interface InstagramTitleSetup {
  readonly text: string | null;
  readonly font: FontId;
  readonly weight: number;
  readonly align: TitleAlign;
  readonly color: string;
  readonly fill: { readonly mode: TitleFill; readonly color: string };
  readonly outline: { readonly enabled: boolean; readonly color: string; readonly width: number };
}

export interface InstagramTitleProps {
  readonly frame: number;
  readonly fps: number;
  readonly layout: Layout;
  readonly entrance: TitleEntrance;
  readonly size: number;
  readonly setup: {
    readonly position: TitlePosition;
    readonly offsetY: number;
    readonly shadow: TitleShadow;
  };
  readonly look: InstagramTitleSetup;
  readonly exit?: number;
}

/** Lines as typed, spaces collapsed, blank lines at the ends dropped. */
const splitLines = (text: string | null): string[] => {
  const lines = (text ?? '').split(/\r?\n/).map((line) => line.replace(/\s+/g, ' ').trim());
  while (lines.length > 0 && lines[0] === '') lines.shift();
  while (lines.length > 0 && lines.at(-1) === '') lines.pop();
  return lines;
};

/**
 * Text like Instagram Stories: the owner's lines, an optional fill hugging them as one rounded
 * shape, an optional outline around the letters. Enters as one piece, so the fill never tears.
 */
export const InstagramTitle: React.FC<InstagramTitleProps> = ({
  frame,
  fps,
  layout,
  entrance,
  size,
  setup,
  look,
  exit,
}) => {
  const loaded = useFonts([look.font]);
  const family = fontFamily(look.font);
  const lines = useMemo(() => splitLines(look.text), [look.text]);
  const baseSize = DESIGN.fontSize * layout.unit * size;
  // Measured once the font is in (an early measure would be cached with the fallback font).
  const widths = useMemo(
    () =>
      loaded
        ? lines.map((line) =>
            line === ''
              ? 0
              : measureText({ text: line, fontFamily: family, fontSize: baseSize, fontWeight: look.weight })
                  .width,
          )
        : null,
    [loaded, lines, family, baseSize, look.weight],
  );
  if (widths === null || lines.length === 0 || (exit ?? 0) >= 1) return null;

  const widest = Math.max(...widths) + 2 * DESIGN.padX * baseSize;
  const fit = fitScale(widest, layout.width - layout.safe.left - layout.safe.right);
  const fontSize = baseSize * fit;
  const padX = DESIGN.padX * fontSize;
  const rowHeight = DESIGN.row * fontSize;
  const rowWidths = widths.map((width) => width * fit + 2 * padX);
  const blockWidth = Math.max(...rowWidths);
  const rows: PlateRow[] = rowWidths.map((width) => {
    const left =
      look.align === 'left' ? 0 : look.align === 'right' ? blockWidth - width : (blockWidth - width) / 2;
    return { left, right: left + width };
  });

  const u = layout.unit * size;
  const shadow = textShadow(setup.shadow, u);
  const filled = look.fill.mode !== 'off';
  const plates = filled
    ? plateRuns(lines).map((run) => {
        const corners = plateCorners(
          rows.slice(run.start, run.start + run.lines.length),
          rowHeight,
          DESIGN.snap * fontSize,
        ).map((point) => ({ x: point.x, y: point.y + run.start * rowHeight }));
        return roundedPath(corners, DESIGN.radius * fontSize);
      })
    : [];
  const outline = look.outline.enabled ? look.outline.width * u : 0;
  const anchor = titleAnchor(layout, setup);
  const motion = entranceMotion(entrance, entranceAt(entrance, frame, fps, 0));

  return (
    <div style={titleBlockStyle(layout, anchor, exit)}>
      <div
        style={{
          position: 'relative',
          width: blockWidth,
          height: lines.length * rowHeight,
          fontSize,
          ...motion,
        }}
      >
        {filled ? (
          <svg
            width={blockWidth}
            height={lines.length * rowHeight}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              overflow: 'visible',
              ...(shadow ? { filter: `drop-shadow(${shadow})` } : {}),
            }}
          >
            {plates.map((path, index) => (
              <path
                key={index}
                d={path}
                fill={look.fill.color}
                fillOpacity={look.fill.mode === 'see-through' ? DESIGN.seeThrough : 1}
              />
            ))}
          </svg>
        ) : null}
        {lines.map((line, index) => {
          const row = rows[index];
          if (line === '' || !row) return null;
          const text: React.CSSProperties = {
            position: 'absolute',
            inset: 0,
            textAlign: 'center',
            whiteSpace: 'pre',
          };
          return (
            <div
              key={index}
              style={{
                position: 'absolute',
                left: row.left,
                top: index * rowHeight,
                width: row.right - row.left,
                height: rowHeight,
                lineHeight: `${rowHeight}px`,
                fontFamily: family,
                fontWeight: look.weight,
                transform: SUBPIXEL_TEXT_TRANSFORM,
              }}
            >
              {outline > 0 ? (
                // A stroked copy behind the text: the stroke shows outside the letters only.
                <div
                  style={{
                    ...text,
                    color: look.outline.color,
                    WebkitTextStroke: `${(2 * outline).toFixed(2)}px ${look.outline.color}`,
                    textShadow: filled ? undefined : shadow,
                  }}
                >
                  {line}
                </div>
              ) : null}
              <div
                style={{ ...text, color: look.color, textShadow: filled || outline > 0 ? undefined : shadow }}
              >
                {line}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
