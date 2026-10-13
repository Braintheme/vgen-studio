import type { TemplateSummaryDto } from '@vgen/shared';
import { computed, type ComputedRef } from 'vue';
import { routeTo } from '@/lib/routes';
import { useEnginesQuery, useTemplatesQuery } from '@/queries/catalog';
import type { ApiRequestError } from '@/queries/errors';
import type { TemplateCardView } from '@/features/templates/types';

export interface TemplateGalleryState {
  readonly cards: ComputedRef<readonly TemplateCardView[]>;
  readonly isLoading: ComputedRef<boolean>;
  readonly error: ComputedRef<ApiRequestError | null>;
  readonly retry: () => void;
}

const SLOT_NOUNS = { image: ['photo', 'photos'], video: ['video', 'videos'] } as const;

/** "2 photos", "1 photo + 1 video"... */
const mediaSummary = (template: TemplateSummaryDto): string => {
  const counts = new Map<keyof typeof SLOT_NOUNS, number>();
  for (const slot of template.mediaSlots) {
    counts.set(slot.kind, (counts.get(slot.kind) ?? 0) + (slot.multiple ? slot.multiple.max : 1));
  }
  return [...counts].map(([kind, count]) => `${count} ${SLOT_NOUNS[kind][count === 1 ? 0 : 1]}`).join(' + ');
};

export const useTemplateGallery = (): TemplateGalleryState => {
  const templates = useTemplatesQuery();
  const engines = useEnginesQuery();

  const cards = computed<TemplateCardView[]>(() => {
    const engineNames = new Map(
      (engines.data.value ?? []).map((engine) => [engine.id, engine.name] as const),
    );
    return (templates.data.value ?? []).map((template) => ({
      id: template.id,
      name: template.name,
      description: template.description,
      engineName: engineNames.get(template.engine) ?? template.engine,
      formats: template.formats,
      mediaSummary: mediaSummary(template),
      thumbnailUrl: template.thumbnailUrl,
      to: routeTo.compose(template.id),
    }));
  });

  return {
    cards,
    isLoading: computed(() => templates.isPending.value),
    error: computed(() => templates.error.value),
    retry: () => {
      void templates.refetch();
    },
  };
};
