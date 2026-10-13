// Installed engines and template definitions (static code from @vgen/catalog, not server
// state). The admin uses the zod schemas and template functions for validation, defaults
// and preview metadata; template lists for display come from the API.
import { createCatalog } from '@vgen/catalog';
import type { TemplateDefinition } from '@vgen/shared';

const catalog = createCatalog();

export const findTemplateDefinition = (templateId: string): TemplateDefinition | undefined =>
  catalog.templates.find(templateId);
