import {
  MusicTrackDtoSchema,
  type CreateMusicTrackRequest,
  type MusicTrackDto,
  type UpdateMusicTrackRequest,
} from '@vgen/shared';
import { z } from 'zod';
import { deleteResource, getJson, http, postJson, type RequestOptions } from './http';

export const musicApi = {
  list: (options: RequestOptions = {}): Promise<MusicTrackDto[]> =>
    getJson(z.array(MusicTrackDtoSchema), '/music', { signal: options.signal }),

  create: (request: CreateMusicTrackRequest): Promise<MusicTrackDto> =>
    postJson(MusicTrackDtoSchema, '/music', request),

  rename: async (id: string, request: UpdateMusicTrackRequest): Promise<MusicTrackDto> =>
    MusicTrackDtoSchema.parse((await http.patch<unknown>(`/music/${id}`, request)).data),

  setDefault: (id: string): Promise<MusicTrackDto> => postJson(MusicTrackDtoSchema, `/music/${id}/default`),

  remove: (id: string): Promise<void> => deleteResource(`/music/${id}`),
};
