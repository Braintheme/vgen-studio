import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationReturnType,
  type UseQueryReturnType,
} from '@tanstack/vue-query';
import type { CreateMediaGroupRequest, MediaGroupDto, UpdateMediaGroupRequest } from '@vgen/shared';
import { toValue, type MaybeRefOrGetter } from 'vue';
import type { ApiRequestError } from '@/api/errors';
import { mediaGroupsApi } from '@/api/media-groups';
import { queryKeys } from './keys';

/** Every media group with its files (few, small: one request). */
export const useMediaGroupsQuery = (
  enabled: MaybeRefOrGetter<boolean> = true,
): UseQueryReturnType<MediaGroupDto[], ApiRequestError> =>
  useQuery({
    queryKey: queryKeys.media.groups,
    queryFn: ({ signal }) => mediaGroupsApi.list({ signal }),
    enabled: () => toValue(enabled),
  });

/** Groups change the library's "in N groups" badges and its group filter: refresh both. */
const useGroupMutation = <TVariables, TResult>(
  mutationFn: (variables: TVariables) => Promise<TResult>,
): UseMutationReturnType<TResult, ApiRequestError, TVariables, unknown> => {
  const client = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: queryKeys.media.groups });
      void client.invalidateQueries({ queryKey: queryKeys.media.libraryAll });
    },
  });
};

export const useCreateMediaGroupMutation = () =>
  useGroupMutation((request: CreateMediaGroupRequest) => mediaGroupsApi.create(request));

export interface UpdateMediaGroupVariables {
  readonly id: string;
  readonly patch: UpdateMediaGroupRequest;
}

export const useUpdateMediaGroupMutation = () =>
  useGroupMutation(({ id, patch }: UpdateMediaGroupVariables) => mediaGroupsApi.update(id, patch));

export const useDeleteMediaGroupMutation = () => useGroupMutation((id: string) => mediaGroupsApi.remove(id));
