// Pure, data-only description of a composited frame. Effects return these nodes;
// SceneRenderer turns them into DOM. Keeping effects as data makes them isomorphic,
// unit-testable and registrable without importing React.

/** CSS declarations in React's camelCase form. */
export type SceneStyle = Readonly<Record<string, string | number | undefined>>;

export type PhotoSource = 'before' | 'after';

export type SceneNode =
  /** A full-frame photo layer (seen through the shared camera); `style` applies to its wrapper. */
  | { readonly kind: 'photo'; readonly source: PhotoSource; readonly style?: SceneStyle }
  /** A full-frame layer (masks, overlays, groups). */
  | { readonly kind: 'fill'; readonly style?: SceneStyle; readonly children?: readonly SceneNode[] }
  /** An absolutely positioned element. */
  | { readonly kind: 'box'; readonly style: SceneStyle; readonly children?: readonly SceneNode[] }
  /** A glass pill label for the "before" or "after" side; `x` is its `align` edge. */
  | {
      readonly kind: 'label';
      readonly side: PhotoSource;
      readonly text: string;
      readonly x: number;
      readonly y: number;
      readonly align?: 'start' | 'end';
      readonly opacity?: number;
    }
  /** The round split-compare handle with two chevrons, centered at (x, y). */
  | {
      readonly kind: 'handle';
      readonly x: number;
      readonly y: number;
      readonly size: number;
      readonly scale: number;
    };
