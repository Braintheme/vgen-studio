import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { EngineDtoSchema, type EngineDto } from '@vgen/shared';
import { z } from 'zod';
import { CatalogService } from '../catalog/catalog.service.js';

@ApiTags('engines')
@Controller('engines')
export class EnginesController {
  constructor(private readonly catalog: CatalogService) {}

  @Get()
  @ApiOkResponse({ standardSchema: z.array(EngineDtoSchema) })
  list(): EngineDto[] {
    return this.catalog.listEngines().map((engine) => ({
      id: engine.id,
      name: engine.name,
      version: engine.version,
      capabilities: {
        formats: [...engine.capabilities.formats],
        fps: [...engine.capabilities.fps],
        codecs: [...engine.capabilities.codecs],
        audio: engine.capabilities.audio,
        maxDurationSec: engine.capabilities.maxDurationSec,
        browserPreview: engine.capabilities.browserPreview,
      },
      templateCount: engine.templates.length,
    }));
  }
}
