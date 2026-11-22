import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectEntity } from '@vgen/db';
import { MediaModule } from '../media/media.module.js';
import { PresetsModule } from '../presets/presets.module.js';
import { RendersModule } from '../renders/renders.module.js';
import { ProjectsController } from './projects.controller.js';
import { ProjectsRepository } from './projects.repository.js';
import { ProjectsService } from './projects.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([ProjectEntity]), MediaModule, PresetsModule, RendersModule],
  controllers: [ProjectsController],
  providers: [ProjectsRepository, ProjectsService],
})
export class ProjectsModule {}
