import { Player, type PlayerRef } from '@remotion/player';
import type { PlayerInput, PlayerState } from '@vgen/shared';
import type React from 'react';
import { useEffect, useMemo, useRef } from 'react';
import { ResolvedAssetsSchema } from '../core/composition.js';
import { findRemotionTemplate } from '../templates/index.js';

export interface PreviewPlayerProps {
  readonly input: PlayerInput;
  readonly onReady: (player: PlayerRef) => void;
  readonly onState: (state: PlayerState) => void;
}

/** The Remotion <Player> for one template, rendering the same composition as the worker. */
export const PreviewPlayer: React.FC<PreviewPlayerProps> = ({ input, onReady, onState }) => {
  const ref = useRef<PlayerRef>(null);
  const entry = findRemotionTemplate(input.template.id);
  // Host input is validated with the same schema the composition declares.
  const assets = useMemo(() => ResolvedAssetsSchema.parse(input.assets), [input.assets]);

  useEffect(() => {
    const player = ref.current;
    if (!player) return undefined;
    onReady(player);
    const emit = (): void => {
      onState({ frame: player.getCurrentFrame(), playing: player.isPlaying() });
    };
    player.addEventListener('frameupdate', emit);
    player.addEventListener('play', emit);
    player.addEventListener('pause', emit);
    return () => {
      player.removeEventListener('frameupdate', emit);
      player.removeEventListener('play', emit);
      player.removeEventListener('pause', emit);
    };
  }, [onReady, onState]);

  if (!entry) {
    return <div style={{ padding: 16, fontFamily: 'sans-serif' }}>Unknown template {input.template.id}</div>;
  }
  const { metadata } = input;
  return (
    <Player
      ref={ref}
      component={entry.component}
      inputProps={{ props: input.props, assets }}
      durationInFrames={metadata.durationInFrames}
      fps={metadata.fps}
      compositionWidth={metadata.width}
      compositionHeight={metadata.height}
      style={{ width: '100%', aspectRatio: `${metadata.width} / ${metadata.height}` }}
      controls
      loop
      clickToPlay
      acknowledgeRemotionLicense
    />
  );
};
