/**
 * Composition root of render engines: the ONLY place that knows which engines are
 * installed. The API and the admin import this isomorphic entry (manifests only);
 * workers import their engine's server adapter directly.
 *
 * Adding an engine = add its package + one line below + its worker service.
 */
import { fakeEngineManifest } from '@vgen/engine-fake/manifest';
import { remotionEngineManifest } from '@vgen/engine-remotion/manifest';
import { buildRegistries, type CatalogRegistries, type EngineManifest } from '@vgen/shared';

export const ENGINE_MANIFESTS: readonly EngineManifest[] = [
  remotionEngineManifest,
  // Development stub proving that engines plug in without core changes (hidden in production).
  fakeEngineManifest,
];

export const createCatalog = (manifests: readonly EngineManifest[] = ENGINE_MANIFESTS): CatalogRegistries =>
  buildRegistries(manifests);
