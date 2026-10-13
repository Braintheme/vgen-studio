import { CatalogService } from '../catalog/catalog.service.js';
import type { TypedConfigService } from '../config/typed-config.service.js';

/** The catalog with every installed engine (no DISABLED_ENGINES), for unit tests. */
export const createTestCatalog = (disabledEngines: readonly string[] = []): CatalogService =>
  new CatalogService({ get: () => disabledEngines } as unknown as TypedConfigService);
