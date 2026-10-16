import { computed, type ComputedRef } from 'vue';
import { findTemplateDefinition } from '@/engines/catalog';
import { useComposeDraftStore } from '@/stores/compose-draft';

/**
 * Which uploads the templates' drafts hold (drafts live in this browser): media id -> the
 * names of the templates using it.
 */
export const useDraftMediaUsage = (): ComputedRef<ReadonlyMap<string, readonly string[]>> => {
  const drafts = useComposeDraftStore();
  return computed(() => {
    const usage = new Map<string, string[]>();
    for (const [templateId, draft] of Object.entries(drafts.all())) {
      const name = findTemplateDefinition(templateId)?.name ?? templateId;
      for (const value of Object.values(draft.media)) {
        const ids: readonly string[] = typeof value === 'string' ? [value] : (value ?? []);
        for (const id of ids) {
          const names = usage.get(id) ?? [];
          if (!names.includes(name)) names.push(name);
          usage.set(id, names);
        }
      }
    }
    return usage;
  });
};
