import type { Format, Fps, OutputMetadata } from '../formats.js';
import type { BaseProps } from '../schema/base.js';
import type { TemplateDefinition } from '../template/definition.js';
import type { ResolvedAssets } from './assets.js';

export type OutputCodec = 'h264';

export interface EngineCapabilities {
  readonly formats: readonly Format[];
  readonly fps: readonly Fps[];
  readonly codecs: readonly OutputCodec[];
  readonly audio: boolean;
  readonly maxDurationSec: number;
  /** Whether the engine ships a browser player adapter for live previews. */
  readonly browserPreview: boolean;
  /** Whether the engine renders image outputs (`renderStills`, templates with `output: 'stills'`). */
  readonly stills: boolean;
}

/**
 * Isomorphic description of an engine and its templates.
 * Safe to import from the API and the browser (no renderer code).
 */
export interface EngineManifest {
  readonly id: string;
  readonly name: string;
  /** Adapter version, including the underlying renderer version as build metadata. */
  readonly version: string;
  readonly capabilities: EngineCapabilities;
  readonly templates: readonly TemplateDefinition[];
}

export type X264Preset = 'veryfast' | 'faster' | 'fast' | 'medium' | 'slow' | 'slower' | 'veryslow';

/** Bitrate as accepted by encoders, e.g. `256k` or `20M`. */
export type Bitrate = `${number}k` | `${number}M`;

/** Delivery encoding settings resolved from a quality preset. */
export interface EncodingSettings {
  readonly crf: number;
  readonly x264Preset: X264Preset;
  /** `null` disables the bitrate cap. */
  readonly maxBitrate: Bitrate | null;
  readonly bufferSize: Bitrate | null;
  readonly audioBitrate: Bitrate;
  readonly audioSampleRate: 48000;
}

export interface EngineRenderInput {
  readonly jobId: string;
  readonly template: TemplateDefinition;
  /** Validated props snapshot. */
  readonly props: BaseProps;
  readonly assets: ResolvedAssets;
  readonly metadata: OutputMetadata;
  readonly encoding: EncodingSettings;
}

export interface EngineRenderOptions {
  readonly outputPath: string;
  /** Progress in the 0..1 range. */
  readonly onProgress: (progress: number) => void;
  readonly signal: AbortSignal;
}

export interface EngineStillOptions {
  readonly outputPath: string;
  readonly frame: number;
  readonly signal: AbortSignal;
}

export interface EngineStillsOptions {
  /** Empty directory for the images. */
  readonly outputDir: string;
  /** Pixel density: 2 renders every image at twice the output size. */
  readonly scale: number;
  /** Progress in the 0..1 range. */
  readonly onProgress: (progress: number) => void;
  readonly signal: AbortSignal;
}

/** Server-side render engine adapter (Strategy). Only workers depend on implementations. */
export interface RenderEngine extends EngineManifest {
  /** One-time warm-up, e.g. bundling compositions. */
  init(): Promise<void>;
  render(input: EngineRenderInput, options: EngineRenderOptions): Promise<void>;
  renderStill(input: EngineRenderInput, options: EngineStillOptions): Promise<void>;
  /**
   * Image outputs (`capabilities.stills`): every frame of the metadata is one image, written
   * losslessly (PNG) into `outputDir`; returns the files in frame order. The worker encodes
   * the delivery JPEGs.
   */
  renderStills?(input: EngineRenderInput, options: EngineStillsOptions): Promise<readonly string[]>;
  dispose(): Promise<void>;
}
