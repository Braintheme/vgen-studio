import { PreviewDtoSchema, type CreatePreviewRequest, type PreviewDto } from '@vgen/shared';
import { postJson, type RequestOptions } from './http';

export const previewsApi = {
  /** Renders (or reuses a cached) preview frame; may take a few seconds. */
  create: (request: CreatePreviewRequest, options: RequestOptions = {}): Promise<PreviewDto> =>
    postJson(PreviewDtoSchema, '/previews', request, options),
};
