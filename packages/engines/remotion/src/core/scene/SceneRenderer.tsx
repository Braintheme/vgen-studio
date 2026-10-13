import type React from 'react';
import { AbsoluteFill } from 'remotion';
import type { Layout } from '../layout.js';
import { placeAt } from '../placement.js';
import { Label } from '../primitives/Label.js';
import type { SceneNode, SceneStyle } from './spec.js';

export interface SceneRendererProps {
  readonly nodes: readonly SceneNode[];
  readonly renderBefore: () => React.ReactNode;
  readonly renderAfter: () => React.ReactNode;
  readonly layout: Layout;
  readonly labelFont: string;
  readonly accent: string;
  readonly textColor: string;
  readonly radius: number;
}

// Scene styles are plain data; React accepts the same camelCase declarations.
const css = (style: SceneStyle | undefined): React.CSSProperties | undefined => style;

const Chevron: React.FC<{ readonly direction: 'left' | 'right'; readonly size: number }> = ({
  direction,
  size,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d={direction === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'}
      stroke="#111"
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** Renders effect/transition scene descriptions (see spec.ts) into the DOM. */
export const SceneRenderer: React.FC<SceneRendererProps> = (props) => {
  const renderNode = (node: SceneNode, key: number): React.ReactNode => {
    switch (node.kind) {
      case 'photo':
        return (
          <AbsoluteFill key={key} style={css(node.style)}>
            {node.source === 'before' ? props.renderBefore() : props.renderAfter()}
          </AbsoluteFill>
        );
      case 'fill':
        return (
          <AbsoluteFill key={key} style={{ pointerEvents: 'none', ...css(node.style) }}>
            {node.children?.map(renderNode)}
          </AbsoluteFill>
        );
      case 'box':
        return (
          <div key={key} style={{ position: 'absolute', ...css(node.style) }}>
            {node.children?.map(renderNode)}
          </div>
        );
      case 'label':
        return (
          <Label
            key={key}
            text={node.text}
            enter={1}
            unit={props.layout.unit}
            fontFamily={props.labelFont}
            accent={node.side === 'after' ? props.accent : 'rgba(255,255,255,0.85)'}
            textColor={props.textColor}
            radius={props.radius}
            x={node.x}
            y={node.y}
            align={node.align ?? 'start'}
            opacity={node.opacity ?? 1}
          />
        );
      case 'handle':
        return (
          <div
            key={key}
            style={{
              ...placeAt(node.x - node.size / 2, node.y - node.size / 2, {
                transform: `scale(${node.scale.toFixed(3)})`,
              }),
              width: node.size,
              height: node.size,
              borderRadius: '50%',
              background: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 ${node.size * 0.1}px ${node.size * 0.45}px rgba(0,0,0,0.35)`,
            }}
          >
            <Chevron direction="left" size={node.size * 0.33} />
            <Chevron direction="right" size={node.size * 0.33} />
          </div>
        );
    }
  };
  return <AbsoluteFill>{props.nodes.map(renderNode)}</AbsoluteFill>;
};
