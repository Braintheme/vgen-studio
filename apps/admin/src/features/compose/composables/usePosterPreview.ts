import { refDebounced } from '@vueuse/core';
import {
  isDeepEqual,
  type CreatePreviewRequest,
  type PlayerInput,
  type TemplateDefinition,
} from '@vgen/shared';
import { computed, type ComputedRef, type Ref } from 'vue';
import { usePreviewFrameQuery } from '@/queries/previews';
import { POSTER_PREVIEW_DEBOUNCE_MS } from '@/features/compose/constants';
import type { PosterPreviewView } from '@/features/compose/types';

export interface PosterPreviewDeps {
  readonly template: TemplateDefinition;
  readonly input: ComputedRef<PlayerInput>;
  /** Only engines without a browser player use server-rendered frames. */
  readonly enabled: Readonly<Ref<boolean>>;
}

const isFilled = (value: string | readonly string[] | null | undefined): boolean =>
  typeof value === 'string' || (Array.isArray(value) && value.length > 0);

/** Fallback preview: the template's poster frame rendered by the engine's worker. */
export const usePosterPreview = ({
  template,
  input,
  enabled,
}: PosterPreviewDeps): ComputedRef<PosterPreviewView> => {
  const mediaReady = computed(() =>
    template.mediaSlots.every((slot) => !slot.required || isFilled(input.value.props.media[slot.key])),
  );
  const request = computed<CreatePreviewRequest | null>(() =>
    enabled.value && mediaReady.value ? { templateId: template.id, props: { ...input.value.props } } : null,
  );
  // Server renders are slower than a live player: wait until edits settle.
  const debounced = refDebounced(request, POSTER_PREVIEW_DEBOUNCE_MS);
  const query = usePreviewFrameQuery(debounced);

  return computed<PosterPreviewView>(() => ({
    url: query.data.value?.url ?? null,
    width: input.value.metadata.width,
    height: input.value.metadata.height,
    // Props objects are rebuilt on every change: compare content, not identity.
    loading: query.isFetching.value || !isDeepEqual(request.value, debounced.value),
    message: !mediaReady.value
      ? 'Add the required media to see a preview frame.'
      : (query.error.value?.message ?? null),
  }));
};
