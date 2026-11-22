import type { ProjectDto, TemplateDefinition } from '@vgen/shared';
import { computed, type ComputedRef } from 'vue';
import { useRoute } from 'vue-router';
import { findTemplateDefinition } from '@/engines/catalog';
import { ROUTE_PARAMS } from '@/lib/routes';
import type { ApiRequestError } from '@/queries/errors';
import { useProjectQuery } from '@/queries/projects';

export type ProjectEditorTarget =
  | { readonly status: 'loading' }
  | { readonly status: 'error'; readonly error: ApiRequestError; readonly retry: () => void }
  | { readonly status: 'missing-template'; readonly templateId: string }
  | { readonly status: 'ready'; readonly project: ProjectDto; readonly template: TemplateDefinition };

/**
 * The project of `/projects/:projectId` and its template. The editor is built once both are in
 * (it reads the project once; later saves only refresh the cache it shares).
 */
export const useProjectEditorTarget = (): ComputedRef<ProjectEditorTarget> => {
  const route = useRoute();
  const id = computed(() => {
    const raw = route.params[ROUTE_PARAMS.projectId];
    return (Array.isArray(raw) ? raw[0] : raw) ?? '';
  });
  const query = useProjectQuery(id);
  return computed<ProjectEditorTarget>(() => {
    const project = query.data.value;
    if (!project) {
      const error = query.error.value;
      return error
        ? {
            status: 'error',
            error,
            retry: () => {
              void query.refetch();
            },
          }
        : { status: 'loading' };
    }
    const template = findTemplateDefinition(project.templateId);
    return template
      ? { status: 'ready', project, template }
      : { status: 'missing-template', templateId: project.templateId };
  });
};
