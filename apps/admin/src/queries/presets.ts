import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationReturnType,
  type UseQueryReturnType,
} from '@tanstack/vue-query';
import type { CreateStylePresetRequest, StylePresetDto, UpdateStylePresetRequest } from '@vgen/shared';
import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import type { ApiRequestError } from '@/api/errors';
import { presetsApi } from '@/api/presets';
import { queryKeys } from './keys';

/** Presets of one template, or of all templates when `templateId` is undefined. */
export const usePresetsQuery = (
  templateId?: MaybeRefOrGetter<string | undefined>,
): UseQueryReturnType<StylePresetDto[], ApiRequestError> =>
  useQuery({
    queryKey: computed(() => queryKeys.presets.list(toValue(templateId))),
    queryFn: ({ signal }) => presetsApi.list(toValue(templateId), { signal }),
  });

const usePresetMutation = <TVariables, TResult>(
  mutationFn: (variables: TVariables) => Promise<TResult>,
): UseMutationReturnType<TResult, ApiRequestError, TVariables, unknown> => {
  const client = useQueryClient();
  return useMutation({
    mutationFn,
    // Resolve only once the lists are fresh, so callers can select the new item.
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.presets.all }),
  });
};

export const useCreatePresetMutation = () =>
  usePresetMutation((request: CreateStylePresetRequest) => presetsApi.create(request));

export const useUpdatePresetMutation = () =>
  usePresetMutation(({ id, ...request }: UpdateStylePresetRequest & { readonly id: string }) =>
    presetsApi.update(id, request),
  );

export const useSetDefaultPresetMutation = () => usePresetMutation((id: string) => presetsApi.setDefault(id));

export const useDeletePresetMutation = () => usePresetMutation((id: string) => presetsApi.remove(id));
