// Compile-time check: the implementation satisfies the published declaration.
import type * as Public from './public.js';
import { remotionPlayerAdapter } from './index.js';

export const publicPlayerAdapter: typeof Public.remotionPlayerAdapter = remotionPlayerAdapter;
