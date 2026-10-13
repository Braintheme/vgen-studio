import {
  TemplateDetailDtoSchema,
  TemplateSummaryDtoSchema,
  type TemplateDetailDto,
  type TemplateSummaryDto,
} from '@vgen/shared';
import { z } from 'zod';
import { getJson, type RequestOptions } from './http';

export const templatesApi = {
  list: (engine?: string, options: RequestOptions = {}): Promise<TemplateSummaryDto[]> =>
    getJson(z.array(TemplateSummaryDtoSchema), '/templates', { params: { engine }, signal: options.signal }),

  get: (id: string, options: RequestOptions = {}): Promise<TemplateDetailDto> =>
    getJson(TemplateDetailDtoSchema, `/templates/${id}`, { signal: options.signal }),
};
