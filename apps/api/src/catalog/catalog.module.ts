import { Global, Module } from '@nestjs/common';
import { CatalogService } from './catalog.service.js';

@Global()
@Module({ providers: [CatalogService], exports: [CatalogService] })
export class CatalogModule {}
