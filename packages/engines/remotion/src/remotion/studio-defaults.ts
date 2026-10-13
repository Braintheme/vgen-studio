import type { BaseProps, TemplateDefinition } from '@vgen/shared';
import { resolveTemplateDefaults } from '@vgen/shared';
import { staticFile } from 'remotion';
import type { RemotionTemplateProps } from '../core/composition.js';

// Placeholder asset ids: Studio renders from `assets`, ids only need to be valid uuids.
const BEFORE_ID = '00000000-0000-4000-8000-00000000b4f0';
const AFTER_ID = '00000000-0000-4000-8000-0000000a47e2';

/**
 * Default inputs for Remotion Studio, using the photo pair in fixtures/.studio
 * (Studio's public dir; see `make fixtures`).
 */
export const studioDefaults = <P extends BaseProps>(
  template: TemplateDefinition<P>,
): RemotionTemplateProps<P> => ({
  props: template.schema.parse({
    ...resolveTemplateDefaults(template),
    media: { before: BEFORE_ID, after: AFTER_ID },
  }),
  assets: {
    media: {
      before: { kind: 'image', src: staticFile('before.jpg'), width: 1600, height: 2400 },
      after: { kind: 'image', src: staticFile('after.jpg'), width: 1600, height: 2400 },
    },
    music: null,
  },
});
