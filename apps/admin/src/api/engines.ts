import { EngineDtoSchema, type EngineDto } from '@vgen/shared';
import { z } from 'zod';
import { getJson, type RequestOptions } from './http';

export const enginesApi = {
  list: (options: RequestOptions = {}): Promise<EngineDto[]> =>
    getJson(z.array(EngineDtoSchema), '/engines', { signal: options.signal }),
};
