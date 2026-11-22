import {
  CreateRenderResponseSchema,
  DuplicateRenderResponseSchema,
  paginated,
  RenderDayDtoSchema,
  RenderJobDtoSchema,
  type CreateRenderRequest,
  type CreateRenderResponse,
  type DuplicateRenderResponse,
  type Paginated,
  type RenderDayDto,
  type RenderDaysQuery,
  type RenderJobDto,
  type RenderListQuery,
  type RenderReadyQuery,
} from '@vgen/shared';
import { z } from 'zod';
import { deleteResource, getJson, http, postJson, type RequestOptions } from './http';

const RenderPageSchema = paginated(RenderJobDtoSchema);
const RenderDaysSchema = z.array(RenderDayDtoSchema);
const RenderListSchema = z.array(RenderJobDtoSchema);

export const rendersApi = {
  list: (query: RenderListQuery, options: RequestOptions = {}): Promise<Paginated<RenderJobDto>> =>
    getJson(RenderPageSchema, '/renders', { params: query, signal: options.signal }),

  /** Render counts per calendar day of `query.tz`, over every page. */
  days: (query: RenderDaysQuery, options: RequestOptions = {}): Promise<RenderDayDto[]> =>
    getJson(RenderDaysSchema, '/renders/days', { params: query, signal: options.signal }),

  /** Done renders in a scope (optionally one day of it), at most `READY_RENDERS_LIMIT`. */
  ready: (query: RenderReadyQuery, options: RequestOptions = {}): Promise<RenderJobDto[]> =>
    getJson(RenderListSchema, '/renders/ready', { params: query, signal: options.signal }),

  markDownloaded: async (ids: readonly string[]): Promise<void> => {
    await http.post('/renders/downloaded', { ids });
  },

  get: (id: string, options: RequestOptions = {}): Promise<RenderJobDto> =>
    getJson(RenderJobDtoSchema, `/renders/${id}`, { signal: options.signal }),

  create: (request: CreateRenderRequest): Promise<CreateRenderResponse> =>
    postJson(CreateRenderResponseSchema, '/renders', request),

  cancel: (id: string): Promise<RenderJobDto> => postJson(RenderJobDtoSchema, `/renders/${id}/cancel`),

  duplicate: (id: string): Promise<DuplicateRenderResponse> =>
    postJson(DuplicateRenderResponseSchema, `/renders/${id}/duplicate`),

  remove: (id: string): Promise<void> => deleteResource(`/renders/${id}`),
};
