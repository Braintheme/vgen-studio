import { TransitionSeries } from '@remotion/transitions';
import type React from 'react';
import { useMemo } from 'react';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import { MusicLayer } from '../../core/audio/MusicLayer.js';
import { imageAsset, placeholderImage, type RemotionTemplateProps } from '../../core/composition.js';
import { useFonts } from '../../core/fonts.js';
import { useLayout } from '../../core/hooks.js';
import { Grain, Vignette } from '../../core/primitives/Overlays.js';
import { renderSeamTransition } from '../../core/transitions/SeamTransition.js';
import { useAdjustedPhoto } from '../../core/photo-adjust/useAdjustedPhoto.js';
import type { BeforeAfterProps } from './manifest.js';
import { Intro } from './scenes/Intro.js';
import { Outro } from './scenes/Outro.js';
import { Showcase } from './scenes/Showcase.js';
import { computeBeforeAfterTimeline } from './timeline.js';

const BEFORE_PLACEHOLDER = placeholderImage('BEFORE');
const AFTER_PLACEHOLDER = placeholderImage('AFTER', '#3a3328', '#191510');

export const BeforeAfter: React.FC<RemotionTemplateProps<BeforeAfterProps>> = ({ props, assets }) => {
  const { fps } = useVideoConfig();
  const layout = useLayout();
  useFonts([props.style.fonts.heading, props.style.fonts.body]);
  const timeline = useMemo(
    () => computeBeforeAfterTimeline({ durationSec: props.durationSec, fps }),
    [props.durationSec, fps],
  );

  const before = useAdjustedPhoto(
    imageAsset(assets.media, 'before')?.src ?? BEFORE_PLACEHOLDER,
    props.params.adjust.before,
  );
  const after = useAdjustedPhoto(
    imageAsset(assets.media, 'after')?.src ?? AFTER_PLACEHOLDER,
    props.params.adjust.after,
  );
  const { texts, style, params } = props;

  return (
    <AbsoluteFill style={{ backgroundColor: style.colors.background }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={timeline.sequences.intro}>
          <Intro
            src={before}
            title={texts.title}
            subtitle={texts.subtitle}
            style={style}
            layout={layout}
            duration={timeline.sequences.intro}
          />
        </TransitionSeries.Sequence>
        {renderSeamTransition(params.introTransition, timeline.seamFrames, layout)}
        <TransitionSeries.Sequence durationInFrames={timeline.sequences.body}>
          <Showcase before={before} after={after} props={props} timeline={timeline} layout={layout} />
        </TransitionSeries.Sequence>
        {renderSeamTransition(params.outroTransition, timeline.seamFrames, layout)}
        <TransitionSeries.Sequence durationInFrames={timeline.sequences.outro}>
          <Outro
            before={before}
            after={after}
            title={texts.title}
            outroText={texts.outroText}
            style={style}
            layout={layout}
            duration={timeline.sequences.outro}
            enterOffset={timeline.seamFrames}
          />
        </TransitionSeries.Sequence>
      </TransitionSeries>
      <Vignette strength={style.vignette} />
      <Grain strength={style.grain} seed={props.seed} />
      <MusicLayer track={assets.music} settings={props.music} />
    </AbsoluteFill>
  );
};
