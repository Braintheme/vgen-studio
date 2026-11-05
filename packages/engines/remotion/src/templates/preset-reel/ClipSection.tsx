import type { ResolvedVideo } from '@vgen/shared';
import type React from 'react';
import { placeholderImage } from '../../core/composition.js';
import { fontFamily } from '../../core/fonts.js';
import type { Layout } from '../../core/layout.js';
import { ease, mix, progress } from '../../core/motion.js';
import { VideoPlane } from '../../core/primitives/VideoPlane.js';
import { StyledTitle } from '../../core/styled-title/StyledTitle.js';
import type { PresetReelProps } from './manifest.js';
import { TIMING, type ReelTimeline } from './timeline.js';

const CLIP_PLACEHOLDER = placeholderImage('CLIP', '#2b3138', '#121519');

const TITLE_SCALE = { s: 0.85, m: 1, l: 1.15 } as const;
/** Fades the clip sound out over its last frames (no click at the cut). */
const AUDIO_FADE_SEC = 0.15;

export interface ClipSectionProps {
  readonly frame: number;
  readonly fps: number;
  readonly layout: Layout;
  readonly props: PresetReelProps;
  readonly video: ResolvedVideo | null;
  readonly timeline: ReelTimeline;
}

/** The user's clip (framed, with an optional punch-in) and the styled title over it. */
export const ClipSection: React.FC<ClipSectionProps> = ({ frame, fps, layout, props, video, timeline }) => {
  const { params, texts, style } = props;
  const frames = (sec: number) => Math.round(sec * fps);

  const punch = timeline.punchIn
    ? progress(frame, timeline.punchIn.from, timeline.punchIn.duration, ease.outCubic)
    : 0;
  const clipFrames = timeline.clip.to - timeline.clip.from;
  const fadeFrames = Math.max(1, frames(AUDIO_FADE_SEC));
  const volume = params.clipAudio.enabled
    ? (local: number) => params.clipAudio.volume * Math.min(1, Math.max(0, (clipFrames - local) / fadeFrames))
    : 0;

  const textOf = (field: { readonly enabled: boolean; readonly value: string }): string | null =>
    field.enabled && field.value.trim().length > 0 ? field.value : null;
  const exit =
    timeline.titleExit === null
      ? 0
      : progress(frame, timeline.titleExit, frames(TIMING.titleOut), ease.inCubic);

  return (
    <>
      <VideoPlane
        video={video}
        placeholder={CLIP_PLACEHOLDER}
        framing={params.framing}
        focusZoom={{ scale: mix(1, params.punchIn.scale, punch), x: params.punchIn.x, y: params.punchIn.y }}
        durationInFrames={clipFrames}
        volume={volume}
        grade={params.clipGrade}
      />
      <StyledTitle
        frame={frame}
        fps={fps}
        layout={layout}
        style={params.titleStyle}
        entrance={params.titleAnimation}
        size={TITLE_SCALE[params.titleSize] * params.titleScale}
        colors={{
          // The Style colours, unless the title has its own.
          text: params.titleOwnColors ? params.titleColor : style.colors.text,
          accent: params.titleOwnColors ? params.titleAccent : style.colors.accent,
          accentFont: fontFamily(params.titleAccentFont),
          heading: fontFamily(style.fonts.heading),
        }}
        setup={{
          position: params.titlePosition,
          offsetY: params.titleOffsetY,
          kickerGap: params.titleKickerGap,
          lineGap: params.titleLineGap,
          tailWeight: params.titleTailWeight,
          shadow: params.titleShadow,
        }}
        lines={{
          kicker: textOf(texts.titleLead),
          hero: textOf(texts.titleHero),
          tail: textOf(texts.titleTail),
        }}
        exit={exit}
      />
    </>
  );
};
