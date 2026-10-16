import type { FontId, ResolvedImage } from '@vgen/shared';
import type React from 'react';
import { useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { MusicLayer } from '../../core/audio/MusicLayer.js';
import { SoundCue } from '../../core/audio/SoundCue.js';
import {
  imageAsset,
  imageAssets,
  placeholderImage,
  videoAsset,
  type RemotionTemplateProps,
} from '../../core/composition.js';
import { fontFamily, useFonts } from '../../core/fonts.js';
import { useLayout } from '../../core/hooks.js';
import type { Layout } from '../../core/layout.js';
import { useAdjustedPhoto } from '../../core/photo-adjust/useAdjustedPhoto.js';
import { BlurredBackdrop } from '../../core/primitives/BlurredBackdrop.js';
import type { Camera } from '../../core/primitives/camera.js';
import { Grain, Vignette } from '../../core/primitives/Overlays.js';
import { PhotoPlane } from '../../core/primitives/PhotoPlane.js';
import { VideoPlane } from '../../core/primitives/VideoPlane.js';
import { RevealEffect } from '../../core/reveals/RevealEffect.js';
import { SeamedSection, type Seam } from '../../core/transitions/SeamedSection.js';
import { cameraAt } from './camera.js';
import { CtaTitle } from './CtaTitle.js';
import { FlipTitle } from './FlipTitle.js';
import { timelineOf, type PresetFlipProps } from './manifest.js';
import { PaletteFx } from './PaletteFx.js';
import { labelCenterY, PresetLabel, type LabelSwap } from './PresetLabel.js';
import { labelIndexAt, photoStateAt, TIMING, type FlipTimeline } from './timeline.js';

const CLIP_PLACEHOLDER = placeholderImage('CLIP', '#2b3138', '#121519');
const BEFORE_PLACEHOLDER = placeholderImage('BEFORE', '#3a3530', '#14110f');
const PRESET_PLACEHOLDER = placeholderImage('PRESET', '#2f4a48', '#101a1a');
/** Fades the clip sound out over its last frames (no click at the cut). */
const AUDIO_FADE_SEC = 0.15;
/** A photo whose proportions differ this much from the frame's is shown whole over a blur. */
const CONTAIN_RATIO = 1.3;

interface Photo {
  readonly src: string;
  readonly width: number;
  readonly height: number;
}

/** One look: cover-fitted, or whole over its own blur when its orientation fights the frame's. */
const Shot: React.FC<{ readonly photo: Photo; readonly camera: Camera; readonly layout: Layout }> = ({
  photo,
  camera,
  layout,
}) => {
  const ratio = photo.width / photo.height / (layout.width / layout.height);
  if (Math.max(ratio, 1 / ratio) < CONTAIN_RATIO) return <PhotoPlane src={photo.src} camera={camera} />;
  return (
    <AbsoluteFill>
      <BlurredBackdrop src={photo.src} />
      <PhotoPlane src={photo.src} camera={camera} imageStyle={{ objectFit: 'contain' }} />
    </AbsoluteFill>
  );
};

/** The number label at a frame: the shown one, or an old -> new swap around a change. */
const labelAt = (
  frame: number,
  fps: number,
  timeline: FlipTimeline,
  text: (index: number) => string,
): LabelSwap | null => {
  const index = labelIndexAt(frame, timeline);
  if (index === null) return null;
  const half = Math.max(1, Math.round((TIMING.labelSwap * fps) / 2));
  for (let next = 1; next < timeline.labelAt.length; next += 1) {
    const at = timeline.labelAt[next] ?? 0;
    if (frame >= at - half && frame < at + half) {
      return { from: text(next - 1), to: text(next), progress: (frame - (at - half)) / (2 * half) };
    }
  }
  return { from: text(index), to: null, progress: 0 };
};

export const PresetFlip: React.FC<RemotionTemplateProps<PresetFlipProps>> = ({ props, assets }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const layout = useLayout();
  const { params, texts, style } = props;
  const accentFont = params.titleAccentFont;
  const fonts: FontId[] = ['montserrat', 'anton', 'league-gothic', accentFont];
  if (params.titleStyle === 'stack') fonts.push('bebas-neue');
  if (params.titleStyle === 'editorial') fonts.push('playfair-display');
  useFonts(fonts);
  const timeline = useMemo(() => timelineOf(props), [props]);

  const before = imageAsset(assets.media, 'before');
  const beforeSrc = useAdjustedPhoto(before?.src ?? BEFORE_PLACEHOLDER, params.adjust.before);
  const presets: readonly ResolvedImage[] = imageAssets(assets.media, 'presets');
  const frameSize = { width: layout.width, height: layout.height };
  const looks: readonly Photo[] = presets.length > 0 ? presets : [{ src: PRESET_PLACEHOLDER, ...frameSize }];
  const photos: readonly Photo[] = [{ ...(before ?? frameSize), src: beforeSrc }, ...looks];
  // Index -1 is the before photo; extra labels (no photo) keep the last look.
  const photo = (index: number): Photo =>
    photos[Math.min(photos.length - 1, index + 1)] ?? { src: BEFORE_PLACEHOLDER, ...frameSize };

  const seam: Seam = { at: timeline.cut, frames: timeline.seamFrames, transition: params.toPhotos };
  const zoomOrigin = `${(50 + params.zoomPoint.x * 50).toFixed(2)}% ${(50 + params.zoomPoint.y * 50).toFixed(2)}%`;
  const clipFrames = timeline.clip.to - timeline.clip.from;
  const fadeFrames = Math.max(1, Math.round(AUDIO_FADE_SEC * fps));
  const clipVolume = params.clipAudio.enabled
    ? (local: number) => params.clipAudio.volume * Math.min(1, Math.max(0, (clipFrames - local) / fadeFrames))
    : 0;

  const camera = cameraAt({
    motion: params.cameraMotion,
    intensity: params.cameraIntensity,
    time: Math.max(0, frame - timeline.cut) / fps,
    total: (timeline.totalFrames - timeline.cut) / fps,
    seed: props.seed,
    width: layout.width,
    height: layout.height,
  });
  const state = photoStateAt(frame, timeline);
  const textOf = (field: { readonly enabled: boolean; readonly value: string }): string | null =>
    field.enabled && field.value.trim().length > 0 ? field.value : null;
  const label = labelAt(
    frame,
    fps,
    timeline,
    (index) => `${texts.labelPrefix.enabled ? texts.labelPrefix.value : ''}${String(index + 1)}`,
  );
  const labelY = labelCenterY(layout, params.labelPosition);
  const ctaEnter = (frame - timeline.ctaAt) / Math.max(1, Math.round(TIMING.ctaIn * fps));

  const photosSoundTrack = assets.sounds?.['photos'];
  const offset = Math.round(params.photosSoundOffsetSec * fps);
  // Music -> photos sound: the music fades out across the switch, the track fades in from it.
  const switchAt = timeline.cut + offset;
  const crossfade = Math.round(params.soundCrossfadeSec * fps);
  const halfFade = Math.round(crossfade / 2);

  return (
    <AbsoluteFill style={{ backgroundColor: style.colors.background, overflow: 'hidden' }}>
      <SeamedSection
        from={timeline.clip.from}
        to={timeline.cut}
        exit={seam}
        layout={layout}
        origin={zoomOrigin}
      >
        {() => (
          <VideoPlane
            video={videoAsset(assets.media, 'clip')}
            placeholder={CLIP_PLACEHOLDER}
            framing={params.framing}
            durationInFrames={clipFrames}
            volume={clipVolume}
            grade={params.clipGrade}
          />
        )}
      </SeamedSection>
      {frame >= timeline.cut && frame < timeline.cut + timeline.seamFrames ? (
        // While the photo lands from the zoom: a dark blur of it around the edges (references/4).
        <BlurredBackdrop src={beforeSrc} brightness={0.3} />
      ) : null}
      <SeamedSection from={timeline.cut} to={timeline.totalFrames} enter={seam} layout={layout}>
        {() =>
          state.to === null ? (
            <Shot photo={photo(state.from)} camera={camera} layout={layout} />
          ) : (
            <RevealEffect
              effect={params.revealEffect}
              progress={state.progress}
              layout={layout}
              accent={params.numberColor}
              beforeLabel={null}
              afterLabel={null}
              seed={props.seed + state.to}
              labelFont={fontFamily('montserrat')}
              textColor={style.colors.text}
              radius={style.radius}
              renderBefore={() => <Shot photo={photo(state.from)} camera={camera} layout={layout} />}
              renderAfter={() => <Shot photo={photo(state.to ?? 0)} camera={camera} layout={layout} />}
            />
          )
        }
      </SeamedSection>
      {frame < timeline.cut ? (
        <FlipTitle
          frame={frame}
          fps={fps}
          layout={layout}
          style={params.titleStyle}
          entrance={params.titleEntrance}
          size={params.titleSize}
          colors={{ text: params.titleColor, accent: params.titleAccent, accentFont: fontFamily(accentFont) }}
          setup={{
            position: params.titlePosition,
            offsetY: params.titleOffsetY,
            kickerGap: params.titleKickerGap,
            lineGap: params.titleLineGap,
            tailWeight: params.titleTailWeight,
            shadow: params.titleShadow,
          }}
          lines={{
            kicker: textOf(texts.titleKicker),
            hero: textOf(texts.titleHero),
            tail: textOf(texts.titleTail),
          }}
        />
      ) : null}
      {params.paletteEffect !== 'off'
        ? timeline.changes.map((change, index) => {
            const until = timeline.holdEnd(index);
            const end =
              params.paletteEffect === 'dots' ? until : change.from + Math.round(TIMING.burst * 1.4 * fps);
            if (frame < change.from || frame >= end) return null;
            return (
              <PaletteFx
                key={index}
                mode={params.paletteEffect === 'dots' ? 'dots' : 'burst'}
                src={photo(change.to).src}
                frame={frame}
                fps={fps}
                from={change.from}
                until={until}
                layout={layout}
                x={layout.width / 2}
                y={labelY}
                shape={params.paletteShape}
                size={params.paletteSize}
                seed={props.seed + index * 101}
              />
            );
          })
        : null}
      {label ? (
        <PresetLabel
          layout={layout}
          word={textOf(texts.labelWord) ?? ''}
          number={label}
          params={params}
          seed={props.seed}
        />
      ) : null}
      {ctaEnter >= 0 ? (
        <CtaTitle
          layout={layout}
          lead={textOf(texts.ctaLead)}
          word={textOf(texts.ctaWord)}
          enter={ctaEnter}
          params={params}
        />
      ) : null}
      <Vignette strength={style.vignette} />
      <Grain strength={style.grain} seed={props.seed} />
      <MusicLayer
        track={assets.music}
        settings={props.music}
        end={
          params.musicUnderClipOnly
            ? { at: switchAt + halfFade, fadeFrames: Math.max(1, crossfade) }
            : undefined
        }
      />
      <SoundCue
        at={timeline.shutterAt}
        cue={params.shutterSound}
        track={assets.sounds?.['shutter']}
        builtIn="shutter"
        fps={fps}
      />
      {photosSoundTrack ? (
        // The user's track, synced to the changes: from the cut to the end.
        <SoundCue
          at={switchAt}
          cue={params.photosSound}
          track={photosSoundTrack}
          builtIn="tick"
          fps={fps}
          maxSec={(timeline.totalFrames - switchAt) / fps}
          fadeInFrames={halfFade}
        />
      ) : (
        // Built-in: a tick on every label change and on the call to action.
        [...timeline.labelAt, timeline.ctaAt].map((at, index) => (
          <SoundCue
            key={index}
            at={at + offset}
            cue={params.photosSound}
            track={undefined}
            builtIn="tick"
            fps={fps}
          />
        ))
      )}
      {timeline.changes.map((change, index) => (
        // Centred on the middle of each photo change, whatever the sound's length.
        <SoundCue
          key={`change-${String(index)}`}
          at={change.from + Math.round(change.duration / 2)}
          align="center"
          cue={params.changeSound}
          track={assets.sounds?.['change']}
          builtIn="tick"
          fps={fps}
        />
      ))}
      <SoundCue
        at={timeline.cut + Math.round(params.swooshOffsetSec * fps)}
        align="center"
        cue={params.swooshSound}
        track={assets.sounds?.['swoosh']}
        builtIn="swoosh"
        fps={fps}
      />
    </AbsoluteFill>
  );
};
