import type { DataSourceOptions } from 'typeorm';
import { ENTITIES } from './entities/index.js';
import { MIGRATIONS } from './migrations/index.js';
import { SnakeNamingStrategy } from './naming-strategy.js';

export interface DbConnectionConfig {
  url: string;
  logging?: boolean;
}

/** Single place that defines how every service connects to Postgres. */
export const createDataSourceOptions = (config: DbConnectionConfig): DataSourceOptions => ({
  type: 'postgres',
  // gen_random_uuid() is built into Postgres 13+, no uuid-ossp extension needed.
  uuidExtension: 'pgcrypto',
  url: config.url,
  entities: ENTITIES,
  // Migrations are registered explicitly (no globs) so dev (TS) and prod (JS) behave the same.
  migrations: MIGRATIONS,
  migrationsTableName: 'typeorm_migrations',
  namingStrategy: new SnakeNamingStrategy(),
  synchronize: false,
  logging: config.logging ?? false,
});
