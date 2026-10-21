import type { MigrationInterface } from 'typeorm';
import { Initial1791826199053 } from './1791826199053-Initial.js';
import { AddRenderStills1792190680914 } from './1792190680914-AddRenderStills.js';

// Every migration must be registered here (generated files are added by hand).
export const MIGRATIONS: Array<new () => MigrationInterface> = [
  Initial1791826199053,
  AddRenderStills1792190680914,
];
