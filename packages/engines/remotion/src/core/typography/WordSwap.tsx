import type React from 'react';
import { SUBPIXEL_TEXT_TRANSFORM } from '../placement.js';
import { graphemes } from './glitch-swap.js';
import { GlitchSwap } from './GlitchSwap.js';
import { decodeState, fadeState, rollState, typewriterState, type WordSwapEffect } from './word-swap.js';

export interface WordSwapProps {
  readonly effect: WordSwapEffect;
  readonly from: string;
  readonly to: string;
  /** 0..1 progress of the swap (0: `from` fully shown, 1: `to`). */
  readonly progress: number;
  readonly seed: number;
  /** Letter spacing in px (constant; applied per letter so the word stays centred). */
  readonly letterSpacing: number;
}

/**
 * One letter's slot: the real letter sizes it (hidden when something else is drawn), so the
 * word never re-flows while it animates.
 */
const Slot: React.FC<{
  readonly letter: string;
  readonly last: boolean;
  readonly letterSpacing: number;
  readonly showLetter: boolean;
  readonly opacity?: number;
  readonly clip?: boolean;
  readonly children?: React.ReactNode;
}> = ({ letter, last, letterSpacing, showLetter, opacity = 1, clip = false, children }) => (
  <span
    style={{
      position: 'relative',
      display: 'inline-block',
      whiteSpace: 'pre',
      marginRight: last ? 0 : letterSpacing,
      transform: SUBPIXEL_TEXT_TRANSFORM,
      opacity,
      // Vertical clip only (flip board): the column may be wider than the letter.
      ...(clip ? { clipPath: 'inset(-0.06em -60% -0.06em -60%)' } : {}),
    }}
  >
    <span style={{ visibility: showLetter ? 'visible' : 'hidden' }}>{letter}</span>
    {children}
  </span>
);

const overlay: React.CSSProperties = {
  position: 'absolute',
  left: '50%',
  top: 0,
  transform: 'translateX(-50%)',
  whiteSpace: 'pre',
};

/** A word turning into another one with a chosen effect (see word-swap.ts). */
export const WordSwap: React.FC<WordSwapProps> = ({ effect, from, to, progress, seed, letterSpacing }) => {
  if (effect === 'glitch') {
    return <GlitchSwap from={from} to={to} progress={progress} seed={seed} letterSpacing={letterSpacing} />;
  }
  const word = (text: string, render: (letter: string, index: number, last: boolean) => React.ReactNode) => {
    const letters = graphemes(text);
    return (
      <span style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
        {letters.map((letter, index) => render(letter, index, index === letters.length - 1))}
      </span>
    );
  };

  if (effect === 'decode') {
    const state = decodeState(from, to, progress, seed);
    return word(state.layout === 'from' ? from : to, (letter, index, last) => {
      const current = state.letters[index];
      const scrambling = current?.scrambling ?? false;
      return (
        <Slot key={index} letter={letter} last={last} letterSpacing={letterSpacing} showLetter={!scrambling}>
          {scrambling ? <span style={{ ...overlay, opacity: 0.7 }}>{current?.glyph}</span> : null}
        </Slot>
      );
    });
  }

  if (effect === 'roll') {
    const state = rollState(from, to, progress, seed);
    return word(state.layout === 'from' ? from : to, (letter, index, last) => {
      const current = state.letters[index];
      return (
        <Slot
          key={index}
          letter={letter}
          last={last}
          letterSpacing={letterSpacing}
          showLetter={false}
          opacity={current?.opacity ?? 0}
          clip
        >
          <span
            style={{
              ...overlay,
              transform: `translateX(-50%) translateY(${(-(current?.offset ?? 0)).toFixed(4)}em)`,
            }}
          >
            {(current?.column ?? []).map((glyph, row) => (
              <span key={row} style={{ display: 'block', height: '1em', textAlign: 'center' }}>
                {glyph}
              </span>
            ))}
          </span>
        </Slot>
      );
    });
  }

  if (effect === 'typewriter') {
    const state = typewriterState(from, to, progress);
    // A zero-width anchor: the cursor never pushes letters around. Between letters it sits in
    // the middle of the gap; after the last one, half a gap behind it.
    const cursor = (left: number) => (
      <span style={{ position: 'relative', display: 'inline-block', width: 0 }}>
        <span
          style={{
            position: 'absolute',
            left,
            top: '-0.05em',
            width: '0.08em',
            height: '1.1em',
            background: 'currentColor',
          }}
        />
      </span>
    );
    return word(state.layout === 'from' ? from : to, (letter, index, last) => (
      <span key={index} style={{ display: 'inline-block' }}>
        {state.cursor && index === state.visible ? cursor(-letterSpacing / 2) : null}
        <Slot letter={letter} last={last} letterSpacing={letterSpacing} showLetter={index < state.visible} />
        {state.cursor && last && state.visible > index ? cursor(letterSpacing / 2) : null}
      </span>
    ));
  }

  const state = fadeState(progress);
  return word(state.layout === 'from' ? from : to, (letter, index, last) => (
    <Slot
      key={index}
      letter={letter}
      last={last}
      letterSpacing={letterSpacing}
      showLetter
      opacity={state.opacity}
    />
  ));
};
