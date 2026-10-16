import type React from 'react';
import { useMemo } from 'react';
import { AbsoluteFill, useVideoConfig } from 'remotion';
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
import { Grain, Vignette } from '../../core/primitives/Overlays.js';
import { SeamedSection, type Seam } from '../../core/transitions/SeamedSection.js';
import { PaletteGradeScene } from '../../core/palette-grade/PaletteGradeScene.js';
import { useAdjustedPhoto } from '../../core/photo-adjust/useAdjustedPhoto.js';
import { CardSection } from './CardSection.js';
import { ClipSection } from './ClipSection.js';
import { paletteTimelineOf, timelineOf, type PresetReelProps } from './manifest.js';
import { SettingsSection } from './SettingsSection.js';

const BEFORE_PLACEHOLDER = placeholderImage('BEFORE');
const AFTER_PLACEHOLDER = placeholderImage('AFTER', '#3a3328', '#191510');

export const PresetReel: React.FC<RemotionTemplateProps<PresetReelProps>> = ({ props, assets }) => {
  const { fps } = useVideoConfig();
  const layout = useLayout();
  const { params, style } = props;
  const fontsLoaded = useFonts([style.fonts.heading, style.fonts.body, params.titleAccentFont]);
  const timeline = useMemo(() => timelineOf(props), [props]);
  const palette = useMemo(() => paletteTimelineOf(props), [props]);

  const toSettings: Seam = {
    at: timeline.settings.from,
    frames: timeline.seamFrames,
    transition: params.toSettings,
  };
  const toCard: Seam = { at: timeline.card.from, frames: timeline.seamFrames, transition: params.toCard };
  const before = useAdjustedPhoto(
    imageAsset(assets.media, 'before')?.src ?? BEFORE_PLACEHOLDER,
    props.params.adjust.before,
  );
  const after = useAdjustedPhoto(
    imageAsset(assets.media, 'after')?.src ?? AFTER_PLACEHOLDER,
    props.params.adjust.after,
  );

  return (
    <AbsoluteFill style={{ backgroundColor: style.colors.background, overflow: 'hidden' }}>
      <SeamedSection from={timeline.clip.from} to={timeline.clip.to} exit={toSettings} layout={layout}>
        {(local) => (
          <ClipSection
            frame={local}
            fps={fps}
            layout={layout}
            props={props}
            video={videoAsset(assets.media, 'clip')}
            timeline={timeline}
          />
        )}
      </SeamedSection>
      <SeamedSection
        from={timeline.settings.from}
        to={timeline.settings.to}
        enter={toSettings}
        exit={toCard}
        layout={layout}
      >
        {(local) => (
          <SettingsSection
            frame={local}
            fps={fps}
            layout={layout}
            props={props}
            screens={imageAssets(assets.media, 'settings')}
            timeline={timeline}
          />
        )}
      </SeamedSection>
      <SeamedSection from={timeline.card.from} to={timeline.card.to} enter={toCard} layout={layout}>
        {(local) =>
          palette ? (
            // palette-grade's process, full screen, instead of the card.
            <AbsoluteFill style={{ backgroundColor: '#000000' }}>
              <PaletteGradeScene
                frame={local}
                fps={fps}
                layout={layout}
                timeline={palette}
                before={before}
                after={after}
                params={params.palette}
                texts={{ beforeLabel: props.texts.beforeLabel, afterLabel: props.texts.afterLabel }}
                fontFamily={fontFamily(style.fonts.heading)}
                textColor={style.colors.text}
                seed={props.seed}
                fontsLoaded={fontsLoaded}
              />
            </AbsoluteFill>
          ) : (
            <CardSection
              frame={local}
              fps={fps}
              layout={layout}
              props={props}
              before={before}
              after={after}
              timeline={timeline}
            />
          )
        }
      </SeamedSection>
      <Vignette strength={style.vignette} />
      <Grain strength={style.grain} seed={props.seed} />
      <MusicLayer track={assets.music} settings={props.music} />
      <SoundCue
        at={timeline.shutterAt}
        cue={params.shutterSound}
        track={assets.sounds?.['shutter']}
        builtIn="shutter"
        fps={fps}
      />
      <SoundCue
        // With the palette finale: on the burst of the dot.
        at={palette ? timeline.card.from + palette.burst.from : timeline.swooshAt}
        cue={params.swooshSound}
        track={assets.sounds?.['swoosh']}
        builtIn="swoosh"
        fps={fps}
      />
    </AbsoluteFill>
  );
};
