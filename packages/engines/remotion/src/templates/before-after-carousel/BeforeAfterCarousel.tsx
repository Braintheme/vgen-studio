import type { ResolvedImage, TextField } from '@vgen/shared';
import type React from 'react';
import { useMemo } from 'react';
import { AbsoluteFill, Img, useCurrentFrame, useVideoConfig } from 'remotion';
import { withAlpha } from '../../core/color.js';
import { readableColor } from '../../core/contrast.js';
import { imageAssets, placeholderImage, type RemotionTemplateProps } from '../../core/composition.js';
import { fontFamily, useFonts } from '../../core/fonts.js';
import { paletteSwatches } from '../../core/palette/swatches.js';
import { usePhotoPalette } from '../../core/palette/usePhotoPalette.js';
import { useAdjustedPhoto } from '../../core/photo-adjust/useAdjustedPhoto.js';
import { useRegionLuminance, type ImageRegion } from '../../core/palette/useRegionLuminance.js';
import { BlurredBackdrop } from '../../core/primitives/BlurredBackdrop.js';
import type { Typography } from '../../core/typography/typography-field.js';
import { labelBox, placePhoto, type Rect } from './layout.js';
import type { BeforeAfterCarouselProps } from './manifest.js';
import { carouselCells, unitOf } from './prepare.js';

type Params = BeforeAfterCarouselProps['params'];

/** Prepared photos already have the exact drawn size: adjust them at that size, never smaller. */
const FULL_SIZE = { maxSide: Infinity } as const;

/** Stand-in for a photo that is not uploaded yet (the SVG is 1080×1920). */
const placeholder = (label: string): ResolvedImage => ({
  kind: 'image',
  src: placeholderImage(label),
  width: 1080,
  height: 1920,
});

/** A label or a caption: its text, typography and own colour (before auto contrast). */
interface BlockText {
  readonly field: TextField;
  readonly type: Typography;
  readonly color: string;
}

interface HalfProps {
  readonly cell: Rect;
  /** Where the photo sits inside the cell. */
  readonly rect: Rect;
  readonly src: string;
  readonly label: BlockText;
  readonly caption: BlockText;
  readonly params: Params;
  readonly unit: number;
}

const JUSTIFY = { top: 'flex-start', center: 'center', bottom: 'flex-end' } as const;

const isShown = (text: BlockText): boolean => text.field.enabled && text.field.value.trim() !== '';

/** CSS of one text of the block. */
const textStyle = (type: Typography, unit: number): React.CSSProperties => ({
  fontFamily: fontFamily(type.font),
  fontWeight: type.weight,
  // Static fonts have one weight: never smear them with a synthesized bold.
  fontSynthesis: 'none',
  fontSize: type.size * unit,
  lineHeight: type.lineHeight,
  letterSpacing: `${String(type.letterSpacing)}em`,
  whiteSpace: 'pre-line',
});

const Half: React.FC<HalfProps> = ({ cell, rect, src, label, caption, params, unit }) => {
  const shown = [label, caption].filter(isShown);
  const offset = params.labelOffset * unit;
  const gap = params.captionType.gap * unit;
  // Auto contrast: the photo under the whole block (as fractions of the drawn photo) is measured.
  const region = useMemo((): ImageRegion | null => {
    if (shown.length === 0 || !params.labelAutoContrast) return null;
    const box = labelBox(
      cell,
      shown.map((text) => ({
        text: text.field.value,
        size: text.type.size * unit,
        lineHeight: text.type.lineHeight,
        letterSpacing: text.type.letterSpacing,
      })),
      { gap, offset, position: params.labelPosition },
    );
    return {
      x: (box.x - rect.x) / rect.width,
      y: (box.y - rect.y) / rect.height,
      width: box.width / rect.width,
      height: box.height / rect.height,
    };
  }, [shown, params, cell, rect, gap, offset, unit]);
  const background = useRegionLuminance(src, region);
  const { labelShadow } = params;
  /** Colour and shadow of a text: a colour switched by the auto contrast gets the opposite glow. */
  const look = (text: BlockText): React.CSSProperties => {
    const color = region ? readableColor(text.color, params.labelContrastColor, background) : text.color;
    // The shadow follows the text's size (the values are set for the label).
    const scale = text.type.size / params.labelType.size;
    const shadowColor = color === text.color ? labelShadow.color : text.color;
    return {
      color,
      textShadow: labelShadow.enabled
        ? `0 ${(labelShadow.offset * scale * unit).toFixed(1)}px ${(labelShadow.blur * scale * unit).toFixed(1)}px ${withAlpha(shadowColor, labelShadow.opacity)}`
        : 'none',
    };
  };
  return (
    <div
      style={{
        position: 'absolute',
        left: cell.x,
        top: cell.y,
        width: cell.width,
        height: cell.height,
        overflow: 'hidden',
      }}
    >
      {params.framing === 'fit' ? (
        <BlurredBackdrop src={src} blur={params.blur * unit} brightness={params.blurBrightness} />
      ) : null}
      {/* Prepared photos are exactly `rect` large (times the scale): drawn 1:1, no resampling. */}
      <Img
        src={src}
        style={{
          position: 'absolute',
          left: rect.x,
          top: rect.y,
          width: rect.width,
          height: rect.height,
          // A photo wider than its cell sticks out on purpose; a host page's CSS reset
          // (`img { max-width: 100% }` in the admin) must not shrink it.
          maxWidth: 'none',
          maxHeight: 'none',
          objectFit: 'cover',
        }}
      />
      {shown.length > 0 ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: JUSTIFY[params.labelPosition],
            alignItems: 'center',
            gap,
            // Top / bottom blocks keep their distance from the edge; centred ones ignore it.
            padding: `${params.labelPosition === 'top' ? offset : 0}px ${(40 * unit).toFixed(1)}px ${params.labelPosition === 'bottom' ? offset : 0}px`,
            textAlign: 'center',
          }}
        >
          {shown.map((text, index) => (
            <div key={index} style={{ ...textStyle(text.type, unit), ...look(text) }}>
              {text.field.value}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};

interface PaletteRowProps {
  /** The edited photo: its colours are shown. */
  readonly src: string;
  /** Centre of the seam. */
  readonly centre: { readonly x: number; readonly y: number };
  /** Along a vertical seam (halves side by side): a column instead of a row. */
  readonly vertical: boolean;
  readonly params: Params;
  readonly unit: number;
}

/** The edit's colours as a line of dots centred on the seam (along it), dark to light. */
const PaletteRow: React.FC<PaletteRowProps> = ({ src, centre, vertical, params, unit }) => {
  const palette = usePhotoPalette(src);
  const colors = useMemo(
    () =>
      paletteSwatches(palette, params.paletteCount)
        .sort((a, b) => a.lightness - b.lightness)
        .map((swatch) => swatch.hex),
    [palette, params.paletteCount],
  );
  const size = params.paletteSize * unit;
  const outline = Math.max(2, size * 0.07);
  return (
    <div
      style={{
        position: 'absolute',
        ...(vertical
          ? { top: 0, bottom: 0, left: centre.x - size / 2, width: size, flexDirection: 'column' }
          : { left: 0, right: 0, top: centre.y - size / 2, height: size }),
        display: 'flex',
        justifyContent: 'center',
        gap: params.paletteSpacing * unit,
      }}
    >
      {colors.map((color, index) => (
        <div
          key={index}
          style={{
            width: size,
            height: size,
            flex: 'none',
            borderRadius: '50%',
            boxSizing: 'border-box',
            background: color,
            border: params.paletteOutline ? `${outline.toFixed(1)}px solid #ffffff` : 'none',
            boxShadow: `0 ${(size * 0.06).toFixed(1)}px ${(size * 0.3).toFixed(1)}px rgba(0,0,0,0.35)`,
          }}
        />
      ))}
    </div>
  );
};

/**
 * One slide per frame: frame `i` shows pair `i` (photos `2i` before, `2i + 1` after), the edited
 * photo first (above, or left with `left-right`; second with `original-first`), each with its
 * label at the bottom, and the edit's palette along the seam.
 */
export const BeforeAfterCarousel: React.FC<RemotionTemplateProps<BeforeAfterCarouselProps>> = ({
  props,
  assets,
}) => {
  const slide = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const { params, texts } = props;
  useFonts([params.labelType.font, params.captionType.font]);
  const unit = unitOf({ width, height });
  const cells = carouselCells({ width, height }, params.gap, params.split);
  const photos = imageAssets(assets.media, 'photos');
  const before = photos[slide * 2] ?? placeholder('BEFORE');
  const after = photos[slide * 2 + 1] ?? placeholder('AFTER');
  // Shared before/after adjustments; neutral ones return the photos untouched. The palette,
  // the auto contrast and the blurred background all see the adjusted photos.
  const beforeSrc = useAdjustedPhoto(before.src, params.adjust.before, FULL_SIZE);
  const afterSrc = useAdjustedPhoto(after.src, params.adjust.after, FULL_SIZE);
  // Both photos take the before photo's frame (the asset hook aligned the after photo to it).
  const rect = placePhoto(before, cells.first, params.framing, params.anchor);
  const editedFirst = params.order === 'edited-first';
  // Each photo keeps its own label, caption and colours, whichever half it takes.
  const { labelType, captionType } = params;
  const edited = {
    src: afterSrc,
    label: { field: texts.afterLabel, type: labelType, color: labelType.afterColor },
    caption: { field: texts.afterCaption, type: captionType, color: captionType.afterColor },
  };
  const original = {
    src: beforeSrc,
    label: { field: texts.beforeLabel, type: labelType, color: labelType.beforeColor },
    caption: { field: texts.beforeCaption, type: captionType, color: captionType.beforeColor },
  };
  const [first, second] = editedFirst ? [edited, original] : [original, edited];
  const halves = [
    { cell: cells.first, ...first },
    { cell: cells.second, ...second },
  ];
  return (
    <AbsoluteFill style={{ backgroundColor: props.style.colors.background }}>
      {halves.map(({ cell, src, label, caption }) => (
        <Half
          key={`${String(cell.x)}-${String(cell.y)}`}
          cell={cell}
          rect={rect}
          src={src}
          label={label}
          caption={caption}
          params={params}
          unit={unit}
        />
      ))}
      {params.palette ? (
        <PaletteRow
          src={afterSrc}
          centre={cells.seam}
          vertical={params.split === 'left-right'}
          params={params}
          unit={unit}
        />
      ) : null}
      {params.border.enabled ? (
        // Over the photos, so their framing and pixel-exact sizes stay as they are.
        <AbsoluteFill
          style={{
            boxSizing: 'border-box',
            border: `${(params.border.width * unit).toFixed(1)}px solid ${params.border.color}`,
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};
