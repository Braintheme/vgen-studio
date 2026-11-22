import {
  MediaGroupDtoSchema,
  type CreateMediaGroupRequest,
  type MediaGroupDto,
  type UpdateMediaGroupRequest,
} from '@vgen/shared';
import { z } from 'zod';
import { deleteResource, getJson, http, postJson, type RequestOptions } from './http';

/** Named sets of library files (e.g. a preset's settings screenshots). */
export const mediaGroupsApi = {
  list: (options: RequestOptions = {}): Promise<MediaGroupDto[]> =>
    getJson(z.array(MediaGroupDtoSchema), '/media-groups', { signal: options.signal }),

  create: (request: CreateMediaGroupRequest): Promise<MediaGroupDto> =>
    postJson(MediaGroupDtoSchema, '/media-groups', request),

  update: async (id: string, request: UpdateMediaGroupRequest): Promise<MediaGroupDto> =>
    MediaGroupDtoSchema.parse((await http.patch<unknown>(`/media-groups/${id}`, request)).data),

  remove: (id: string): Promise<void> => deleteResource(`/media-groups/${id}`),
};
