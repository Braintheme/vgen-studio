import os from 'node:os';
import path from 'node:path';
import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediaAssetEntity } from '@vgen/db';
import { TypedConfigService } from '../config/typed-config.service.js';
import { MediaIngestService } from './media-ingest.service.js';
import { MediaController } from './media.controller.js';
import { MediaRepository } from './media.repository.js';
import { MediaService } from './media.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([MediaAssetEntity]),
    MulterModule.registerAsync({
      inject: [TypedConfigService],
      useFactory: (config: TypedConfigService) => ({
        // Uploads stream to disk (never buffered in memory) and are removed after ingest.
        dest: path.join(os.tmpdir(), 'vgen-uploads'),
        limits: { fileSize: config.get('MAX_UPLOAD_MB') * 1024 * 1024, files: 10 },
      }),
    }),
  ],
  controllers: [MediaController],
  providers: [MediaRepository, MediaIngestService, MediaService],
  exports: [MediaService],
})
export class MediaModule {}
