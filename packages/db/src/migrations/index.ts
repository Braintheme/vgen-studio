import type { MigrationInterface } from 'typeorm';
import { Initial1791826199053 } from './1791826199053-Initial.js';
import { AddRenderStills1792190680914 } from './1792190680914-AddRenderStills.js';
import { AddRenderDownloadedAt1795000000000 } from './1795000000000-AddRenderDownloadedAt.js';

// Every migration must be registered here (generated files are added by hand).
export const MIGRATIONS: Array<new () => MigrationInterface> = [
  Initial1791826199053,
  AddRenderStills1792190680914,
  AddRenderDownloadedAt1795000000000,
];
