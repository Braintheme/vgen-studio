import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StylePresetEntity } from '@vgen/db';
import { PresetsController } from './presets.controller.js';
import { PresetsRepository } from './presets.repository.js';
import { PresetsService } from './presets.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([StylePresetEntity])],
  controllers: [PresetsController],
  providers: [PresetsRepository, PresetsService],
  exports: [PresetsService],
})
export class PresetsModule {}
