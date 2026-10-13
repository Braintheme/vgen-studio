import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { createDataSourceOptions } from '@vgen/db';
import { AuthModule } from './auth/auth.module.js';
import { CatalogModule } from './catalog/catalog.module.js';
import { AppConfigModule } from './config/config.module.js';
import { TypedConfigService } from './config/typed-config.service.js';
import { EnginesModule } from './engines/engines.module.js';
import { HealthModule } from './health/health.module.js';
import { MediaModule } from './media/media.module.js';
import { MusicModule } from './music/music.module.js';
import { PresetsModule } from './presets/presets.module.js';
import { PreviewsModule } from './previews/previews.module.js';
import { QueueModule } from './queue/queue.module.js';
import { RedisModule } from './redis/redis.module.js';
import { RendersModule } from './renders/renders.module.js';
import { StorageModule } from './storage/storage.module.js';
import { TemplatesModule } from './templates/templates.module.js';

@Module({
  imports: [
    AppConfigModule,
    TypeOrmModule.forRootAsync({
      imports: [AppConfigModule],
      inject: [TypedConfigService],
      useFactory: (config: TypedConfigService) => ({
        ...createDataSourceOptions({ url: config.get('DATABASE_URL'), logging: config.get('DB_LOGGING') }),
        migrationsRun: config.get('DB_MIGRATE_ON_START'),
      }),
    }),
    RedisModule,
    StorageModule,
    AuthModule,
    CatalogModule,
    QueueModule,
    HealthModule,
    EnginesModule,
    TemplatesModule,
    MediaModule,
    MusicModule,
    PresetsModule,
    PreviewsModule,
    RendersModule,
  ],
})
export class AppModule {}
