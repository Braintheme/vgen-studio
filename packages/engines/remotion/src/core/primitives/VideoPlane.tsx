import type React from 'react';
import { Video } from '@remotion/media';
import type { ResolvedVideo } from '@vgen/shared';
import { AbsoluteFill, Freeze, Img, useCurrentFrame, useVideoConfig } from 'remotion';
import { framingOffset, isSideways, type VideoFraming } from '../video-framing/framing.js';
import { useGradeFilter } from '../video-grade/GradeFilter.js';
import type { VideoGrade } from '../video-grade/schema.js';

/** A zoom about a point of the frame (-1..1 per axis, 0 = center); `scale` 1 = none. */
export interface FocusZoom {
  readonly scale: number;
  readonly x: number;
  readonly y: number;
}

export interface VideoPlaneProps {
  readonly video: ResolvedVideo | null;
  /** Shown while no video is uploaded (live preview). */
  readonly placeholder: string;
  readonly framing: VideoFraming;
  readonly focusZoom?: FocusZoom;
  /** Length of the fragment, frames; later frames hold its last frame. */
  readonly durationInFrames: number;
  /** 0 mutes the clip. Either a constant or a per-frame curve. */
  readonly volume: number | ((frame: number) => number);
  /** Colour grading of the clip (none when omitted or neutral). */
  readonly grade?: VideoGrade;
}

/**
 * A video fragment filling the frame: cover-fitted, reframed (rotation, zoom, pan) and optionally
 * zoomed about a focus point (punch-ins). Everything moves by transforms only.
 */
export const VideoPlane: React.FC<VideoPlaneProps> = ({
  video,
  placeholder,
  framing,
  focusZoom,
  durationInFrames,
  volume,
  grade,
}) => {
  const graded = useGradeFilter(grade);
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const size = video ?? { width, height };
  // The rotation is for the clip; the placeholder only stands in for it.
  const rotate = video ? (framing.rotate ?? 0) : 0;
  const fit = framingOffset(size, { width, height }, { ...framing, rotate });
  const zoom = Math.max(1, framing.zoom);
  const punch = focusZoom ?? { scale: 1, x: 0, y: 0 };
  // Zooming about P keeps P in place: v' = P + s (v - P) = s v + (1 - s) P.
  const px = (punch.x * width) / 2;
  const py = (punch.y * height) / 2;
  const outer = `translate(${((1 - punch.scale) * px).toFixed(3)}px, ${((1 - punch.scale) * py).toFixed(3)}px) scale(${punch.scale.toFixed(5)})`;
  const inner = `translate(${fit.x.toFixed(3)}px, ${fit.y.toFixed(3)}px) scale(${zoom.toFixed(5)})`;
  // `fit` is the size on screen: a quarter-turned element is laid out the other way round.
  const boxWidth = isSideways(rotate) ? fit.height : fit.width;
  const boxHeight = isSideways(rotate) ? fit.width : fit.height;
  const media: React.CSSProperties = {
    position: 'absolute',
    left: (width - boxWidth) / 2,
    top: (height - boxHeight) / 2,
    width: boxWidth,
    height: boxHeight,
    ...(rotate === 0 ? {} : { transform: `rotate(${String(rotate)}deg)`, transformOrigin: '50% 50%' }),
  };
  const silent = typeof volume === 'number' && volume <= 0;
  return (
    <AbsoluteFill
      style={graded.filter ? { overflow: 'hidden', filter: graded.filter } : { overflow: 'hidden' }}
    >
      {graded.defs}
      <AbsoluteFill style={{ transform: outer, transformOrigin: '50% 50%' }}>
        <AbsoluteFill style={{ transform: inner, transformOrigin: '50% 50%' }}>
          {video ? (
            <Freeze frame={Math.max(0, durationInFrames - 1)} active={frame >= durationInFrames}>
              <Video
                src={video.src}
                trimBefore={Math.round(video.startSec * fps)}
                objectFit="fill"
                style={media}
                muted={silent || !video.hasAudio}
                volume={volume}
              />
            </Freeze>
          ) : (
            <Img src={placeholder} style={{ ...media, objectFit: 'cover' }} />
          )}
        </AbsoluteFill>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
