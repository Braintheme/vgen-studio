import {
  StylePresetDtoSchema,
  type CreateStylePresetRequest,
  type StylePresetDto,
  type UpdateStylePresetRequest,
} from '@vgen/shared';
import { z } from 'zod';
import { deleteResource, getJson, http, postJson, type RequestOptions } from './http';

export const presetsApi = {
  list: (templateId?: string, options: RequestOptions = {}): Promise<StylePresetDto[]> =>
    getJson(z.array(StylePresetDtoSchema), '/presets', { params: { templateId }, signal: options.signal }),

  create: (request: CreateStylePresetRequest): Promise<StylePresetDto> =>
    postJson(StylePresetDtoSchema, '/presets', request),

  update: async (id: string, request: UpdateStylePresetRequest): Promise<StylePresetDto> =>
    StylePresetDtoSchema.parse((await http.patch<unknown>(`/presets/${id}`, request)).data),

  setDefault: (id: string): Promise<StylePresetDto> =>
    postJson(StylePresetDtoSchema, `/presets/${id}/default`),

  remove: (id: string): Promise<void> => deleteResource(`/presets/${id}`),
};
