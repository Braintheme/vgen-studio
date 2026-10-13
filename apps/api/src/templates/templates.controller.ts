import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import {
  TemplateDetailDtoSchema,
  TemplateListQuerySchema,
  TemplateSummaryDtoSchema,
  type TemplateDetailDto,
  type TemplateSummaryDto,
} from '@vgen/shared';
import { z } from 'zod';
import { TemplatesService } from './templates.service.js';

@ApiTags('templates')
@Controller('templates')
export class TemplatesController {
  constructor(private readonly templates: TemplatesService) {}

  @Get()
  @ApiOkResponse({ standardSchema: z.array(TemplateSummaryDtoSchema) })
  list(
    @Query({ schema: TemplateListQuerySchema }) query: z.output<typeof TemplateListQuerySchema>,
  ): TemplateSummaryDto[] {
    return this.templates.list(query.engine);
  }

  @Get(':id')
  @ApiOkResponse({ standardSchema: TemplateDetailDtoSchema })
  get(@Param('id') id: string): TemplateDetailDto {
    return this.templates.get(id);
  }
}
