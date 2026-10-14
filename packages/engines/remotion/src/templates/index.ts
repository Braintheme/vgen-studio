// React-side registry of this engine's templates: definition + composition component.
// Used by the Studio/bundle root and by the browser player adapter.
import type { BaseProps, TemplateDefinition } from '@vgen/shared';
import type React from 'react';
import type { RemotionTemplateProps } from '../core/composition.js';
import { BeforeAfterCard } from './before-after-card/BeforeAfterCard.js';
import { beforeAfterCardTemplate } from './before-after-card/manifest.js';
import { BeforeAfter } from './before-after/BeforeAfter.js';
import { beforeAfterTemplate } from './before-after/manifest.js';
import { PresetReel } from './preset-reel/PresetReel.js';
import { presetReelTemplate } from './preset-reel/manifest.js';

export interface RemotionTemplateEntry {
  readonly template: TemplateDefinition;
  readonly component: React.FC<RemotionTemplateProps>;
}

/**
 * Pairs a template with its composition. The component receives props that its own
 * template schema validated, so widening its props type to BaseProps here is safe.
 */
const entry = <P extends BaseProps>(
  template: TemplateDefinition<P>,
  component: React.FC<RemotionTemplateProps<P>>,
): RemotionTemplateEntry => ({
  template: template,
  component: component as unknown as React.FC<RemotionTemplateProps>,
});

export const REMOTION_TEMPLATES: readonly RemotionTemplateEntry[] = [
  entry(beforeAfterTemplate, BeforeAfter),
  entry(beforeAfterCardTemplate, BeforeAfterCard),
  entry(presetReelTemplate, PresetReel),
];

export const findRemotionTemplate = (templateId: string): RemotionTemplateEntry | undefined =>
  REMOTION_TEMPLATES.find((candidate) => candidate.template.id === templateId);
