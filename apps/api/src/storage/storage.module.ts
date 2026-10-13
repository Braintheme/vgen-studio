import { Global, Module } from '@nestjs/common';
import { LocalStorageService } from '@vgen/storage';
import { TypedConfigService } from '../config/typed-config.service.js';

/** DI token for the StorageService port (local volume now, S3/MinIO later). */
export const STORAGE = Symbol('STORAGE');

@Global()
@Module({
  providers: [
    {
      provide: STORAGE,
      inject: [TypedConfigService],
      useFactory: (config: TypedConfigService) => new LocalStorageService(config.get('MEDIA_ROOT')),
    },
  ],
  exports: [STORAGE],
})
export class StorageModule {}
