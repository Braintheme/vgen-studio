import {
  CreateRenderResponseSchema,
  DuplicateRenderResponseSchema,
  paginated,
  RenderJobDtoSchema,
  type CreateRenderRequest,
  type CreateRenderResponse,
  type DuplicateRenderResponse,
  type Paginated,
  type RenderJobDto,
  type RenderListQuery,
} from '@vgen/shared';
import { deleteResource, getJson, postJson, type RequestOptions } from './http';

const RenderPageSchema = paginated(RenderJobDtoSchema);

export const rendersApi = {
  list: (query: RenderListQuery, options: RequestOptions = {}): Promise<Paginated<RenderJobDto>> =>
    getJson(RenderPageSchema, '/renders', { params: query, signal: options.signal }),

  get: (id: string, options: RequestOptions = {}): Promise<RenderJobDto> =>
    getJson(RenderJobDtoSchema, `/renders/${id}`, { signal: options.signal }),

  create: (request: CreateRenderRequest): Promise<CreateRenderResponse> =>
    postJson(CreateRenderResponseSchema, '/renders', request),

  cancel: (id: string): Promise<RenderJobDto> => postJson(RenderJobDtoSchema, `/renders/${id}/cancel`),

  duplicate: (id: string): Promise<DuplicateRenderResponse> =>
    postJson(DuplicateRenderResponseSchema, `/renders/${id}/duplicate`),

  remove: (id: string): Promise<void> => deleteResource(`/renders/${id}`),
};
