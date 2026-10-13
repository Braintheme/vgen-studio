// Entry point for the TypeORM CLI (migrations).
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { createDataSourceOptions } from './options.js';

const url = process.env['DATABASE_URL'];
if (!url) {
  throw new Error('DATABASE_URL is not set');
}

export default new DataSource(createDataSourceOptions({ url }));
