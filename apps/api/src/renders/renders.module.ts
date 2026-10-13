import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RenderJobEntity } from '@vgen/db';
import { MediaModule } from '../media/media.module.js';
import { MusicModule } from '../music/music.module.js';
import { PresetsModule } from '../presets/presets.module.js';
import { QueueModule } from '../queue/queue.module.js';
import { RenderEventsService } from './render-events.service.js';
import { RendersController } from './renders.controller.js';
import { RendersRepository } from './renders.repository.js';
import { RendersService } from './renders.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([RenderJobEntity]),
    MediaModule,
    MusicModule,
    PresetsModule,
    QueueModule,
  ],
  controllers: [RendersController],
  providers: [RendersRepository, RenderEventsService, RendersService],
})
export class RendersModule {}
