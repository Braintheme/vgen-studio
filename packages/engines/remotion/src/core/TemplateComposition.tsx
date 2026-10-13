import type { BaseProps, TemplateDefinition } from '@vgen/shared';
import type React from 'react';
import { Composition } from 'remotion';
import { z } from 'zod';
import { ResolvedAssetsSchema, type RemotionTemplateProps } from './composition.js';

export interface TemplateCompositionProps<P extends BaseProps> {
  readonly template: TemplateDefinition<P>;
  readonly component: React.FC<RemotionTemplateProps<P>>;
  readonly defaultProps: RemotionTemplateProps<P>;
}

const compositionSchema = <P extends BaseProps>(template: TemplateDefinition<P>) =>
  z.object({ props: template.schema, assets: ResolvedAssetsSchema });

/**
 * Registers a template as a Remotion composition: composition id = template id,
 * size/fps/duration come from the template, and `schema` makes Studio's editor
 * and Remotion's input validation use the template's zod schema.
 */
export const TemplateComposition = <P extends BaseProps>({
  template,
  component,
  defaultProps,
}: TemplateCompositionProps<P>): React.ReactElement => {
  const schema = compositionSchema(template);
  const metadata = template.resolveMetadata(defaultProps.props);
  return (
    <Composition
      id={template.id}
      schema={schema}
      component={component}
      defaultProps={defaultProps}
      calculateMetadata={({ props }: { readonly props: Readonly<Record<string, unknown>> }) =>
        template.resolveMetadata(template.schema.parse(props['props']))
      }
      width={metadata.width}
      height={metadata.height}
      fps={metadata.fps}
      durationInFrames={metadata.durationInFrames}
    />
  );
};
