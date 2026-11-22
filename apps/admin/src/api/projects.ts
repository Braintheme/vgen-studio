import {
  DeleteProjectsResponseSchema,
  paginated,
  ProjectDayDtoSchema,
  ProjectDtoSchema,
  RenderProjectsResponseSchema,
  type CreateProjectRequest,
  type DeleteProjectsResponse,
  type Paginated,
  type ProjectDayDto,
  type ProjectDaysQuery,
  type ProjectDto,
  type ProjectListQuery,
  type ProjectSelectableQuery,
  type RenderProjectsResponse,
  type UpdateProjectRequest,
} from '@vgen/shared';
import { z } from 'zod';
import { deleteResource, getJson, http, postJson, type RequestOptions } from './http';

const ProjectPageSchema = paginated(ProjectDtoSchema);

export const projectsApi = {
  list: (query: ProjectListQuery, options: RequestOptions = {}): Promise<Paginated<ProjectDto>> =>
    getJson(ProjectPageSchema, '/projects', { params: query, signal: options.signal }),

  days: (query: ProjectDaysQuery, options: RequestOptions = {}): Promise<ProjectDayDto[]> =>
    getJson(z.array(ProjectDayDtoSchema), '/projects/days', { params: query, signal: options.signal }),

  selectable: (query: ProjectSelectableQuery, options: RequestOptions = {}): Promise<ProjectDto[]> =>
    getJson(z.array(ProjectDtoSchema), '/projects/selectable', { params: query, signal: options.signal }),

  get: (id: string, options: RequestOptions = {}): Promise<ProjectDto> =>
    getJson(ProjectDtoSchema, `/projects/${id}`, { signal: options.signal }),

  create: (request: CreateProjectRequest): Promise<ProjectDto> =>
    postJson(ProjectDtoSchema, '/projects', request),

  update: async (id: string, request: UpdateProjectRequest): Promise<ProjectDto> =>
    ProjectDtoSchema.parse((await http.patch<unknown>(`/projects/${id}`, request)).data),

  duplicate: (id: string, name?: string): Promise<ProjectDto> =>
    postJson(ProjectDtoSchema, `/projects/${id}/duplicate`, name ? { name } : {}),

  remove: (id: string): Promise<void> => deleteResource(`/projects/${id}`),

  removeMany: (ids: readonly string[]): Promise<DeleteProjectsResponse> =>
    postJson(DeleteProjectsResponseSchema, '/projects/delete', { ids }),

  render: (ids: readonly string[]): Promise<RenderProjectsResponse> =>
    postJson(RenderProjectsResponseSchema, '/projects/render', { ids }),
};
