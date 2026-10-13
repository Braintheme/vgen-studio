import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MusicTrackEntity } from '@vgen/db';
import { MediaModule } from '../media/media.module.js';
import { PresetsModule } from '../presets/presets.module.js';
import { MusicController } from './music.controller.js';
import { MusicRepository } from './music.repository.js';
import { MusicService } from './music.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([MusicTrackEntity]), MediaModule, PresetsModule],
  controllers: [MusicController],
  providers: [MusicRepository, MusicService],
  exports: [MusicService],
})
export class MusicModule {}
