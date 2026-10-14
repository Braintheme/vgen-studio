import type { ResolvedImage } from '@vgen/shared';
import type React from 'react';
import { BackgroundLayer } from '../../core/backgrounds/BackgroundLayer.js';
import { placeholderImage } from '../../core/composition.js';
import { fontFamily } from '../../core/fonts.js';
import type { Layout } from '../../core/layout.js';
import { placeAt } from '../../core/placement.js';
import { fitInside, ScreenshotPanel } from '../../core/primitives/ScreenshotPanel.js';
import type { PresetReelProps } from './manifest.js';
import { screenIndexAt, type ReelTimeline } from './timeline.js';

const SCREEN_PLACEHOLDER = placeholderImage('SETTINGS', '#3a3d42', '#26282c');
const PLACEHOLDER_ASPECT = 0.8;
const TITLE_PX = 62;
/**
 * Panel box relative to the frame (references/2: ~0.87 W wide, centered at ~0.495 H, the
 * tallest screenshots ~0.56 H); the title sits above it.
 */
const BOX = {
  portrait: { titleY: 0.18, centerY: 0.495, width: 0.87, height: 0.58 },
  square: { titleY: 0.11, centerY: 0.55, width: 0.66, height: 0.7 },
  landscape: { titleY: 0.12, centerY: 0.56, width: 0.5, height: 0.72 },
} as const;
const PERSPECTIVE = 1800;

export interface SettingsSectionProps {
  readonly frame: number;
  readonly fps: number;
  readonly layout: Layout;
  readonly props: PresetReelProps;
  readonly screens: readonly ResolvedImage[];
  readonly timeline: ReelTimeline;
}

/** "Lightroom Settings": the screenshots switch hard, in a bordered panel on an animated background. */
export const SettingsSection: React.FC<SettingsSectionProps> = ({
  frame,
  fps,
  layout,
  props,
  screens,
  timeline,
}) => {
  const { params, texts, style } = props;
  const box =
    BOX[
      layout.orientation === 'portrait' && layout.height / layout.width < 1.4 ? 'square' : layout.orientation
    ];
  const screen = screens[screenIndexAt(frame, timeline)] ?? null;
  const aspect = screen ? screen.width / screen.height : PLACEHOLDER_ASPECT;
  const size = fitInside(aspect, { width: layout.width * box.width, height: layout.height * box.height });
  const top = layout.height * box.centerY - size.height / 2;

  // A slow float: small tilts and a gentle bob (translation and rotation only, no scale).
  const t = frame / fps;
  const float = params.panelFloat
    ? {
        rotateY: 2.2 * Math.sin((t * Math.PI * 2) / 7.5),
        rotateX: 1.3 * Math.sin((t * Math.PI * 2) / 9.5 + 1.1),
        bob: 7 * layout.unit * Math.sin((t * Math.PI * 2) / 6.5 + 0.4),
        sway: 16 * layout.unit * Math.sin((t * Math.PI * 2) / 8.5 + 2.2),
      }
    : { rotateY: 0, rotateX: 0, bob: 0, sway: 0 };

  return (
    <>
      <BackgroundLayer
        background={params.background}
        timeSec={t}
        layout={layout}
        seed={props.seed}
        base={style.colors.background}
        accent={style.colors.accent}
      />
      {texts.settingsTitle.enabled ? (
        <div
          style={{
            ...placeAt(layout.width / 2, layout.height * box.titleY, { transform: 'translate(-50%, -50%)' }),
            fontFamily: fontFamily(style.fonts.heading),
            fontWeight: 800,
            fontSize: TITLE_PX * layout.unit,
            letterSpacing: '0.08em',
            whiteSpace: 'nowrap',
            color: style.colors.text,
            textShadow: '0 4px 16px rgba(0,0,0,0.6)',
          }}
        >
          {texts.settingsTitle.value}
        </div>
      ) : null}
      <div
        style={{
          ...placeAt((layout.width - size.width) / 2 + float.sway, top + float.bob, {
            transform: `perspective(${String(PERSPECTIVE * layout.unit)}px) rotateX(${float.rotateX.toFixed(3)}deg) rotateY(${float.rotateY.toFixed(3)}deg)`,
          }),
          width: size.width,
          height: size.height,
        }}
      >
        <ScreenshotPanel
          src={screen?.src ?? SCREEN_PLACEHOLDER}
          width={size.width}
          height={size.height}
          border={{
            width: params.screenBorder.width * layout.unit,
            color: params.screenBorder.color,
            radius: params.screenBorder.radius * layout.unit,
          }}
          shadow={60 * layout.unit}
        />
      </div>
    </>
  );
};
