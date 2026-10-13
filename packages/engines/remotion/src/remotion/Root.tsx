import type React from 'react';
import { TemplateComposition } from '../core/TemplateComposition.js';
import { REMOTION_TEMPLATES } from '../templates/index.js';
import { studioDefaults } from './studio-defaults.js';

/** Every template of this engine, registered as a composition (id = template id). */
export const RemotionRoot: React.FC = () => (
  <>
    {REMOTION_TEMPLATES.map(({ template, component }) => (
      <TemplateComposition
        key={template.id}
        template={template}
        component={component}
        defaultProps={studioDefaults(template)}
      />
    ))}
  </>
);
