import { useQuery, type UseQueryReturnType } from '@tanstack/vue-query';
import type { EngineDto, TemplateSummaryDto } from '@vgen/shared';
import type { ApiRequestError } from '@/api/errors';
import { enginesApi } from '@/api/engines';
import { templatesApi } from '@/api/templates';
import { queryKeys } from './keys';

/** Engines and templates only change on deploy. */
const CATALOG_STALE_TIME_MS = 5 * 60_000;

export const useTemplatesQuery = (): UseQueryReturnType<TemplateSummaryDto[], ApiRequestError> =>
  useQuery({
    queryKey: queryKeys.templates.list(),
    queryFn: ({ signal }) => templatesApi.list(undefined, { signal }),
    staleTime: CATALOG_STALE_TIME_MS,
  });

export const useEnginesQuery = (): UseQueryReturnType<EngineDto[], ApiRequestError> =>
  useQuery({
    queryKey: queryKeys.engines.all,
    queryFn: ({ signal }) => enginesApi.list({ signal }),
    staleTime: CATALOG_STALE_TIME_MS,
  });
