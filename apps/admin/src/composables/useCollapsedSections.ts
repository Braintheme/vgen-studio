import { computed, type WritableComputedRef } from 'vue';
import { useUiStore } from '@/stores/ui';

/**
 * Ids of the collapsed sections of one form, remembered in the browser (per `scope`, e.g.
 * `compose:<templateId>`), so settings the owner is done with stay folded away.
 */
export const useCollapsedSections = (scope: string): WritableComputedRef<readonly string[]> => {
  const store = useUiStore();
  return computed({
    get: () => store.collapsedSectionsOf(scope),
    set: (ids) => {
      store.setCollapsedSections(scope, ids);
    },
  });
};
