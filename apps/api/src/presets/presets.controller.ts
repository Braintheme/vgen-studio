import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import {
  CreateStylePresetRequestSchema,
  StylePresetDtoSchema,
  StylePresetListQuerySchema,
  UpdateStylePresetRequestSchema,
  type CreateStylePresetRequest,
  type StylePresetDto,
  type StylePresetListQuery,
  type UpdateStylePresetRequest,
} from '@vgen/shared';
import { z } from 'zod';
import { PresetsService } from './presets.service.js';

@ApiTags('presets')
@Controller('presets')
export class PresetsController {
  constructor(private readonly presets: PresetsService) {}

  @Get()
  @ApiOkResponse({ standardSchema: z.array(StylePresetDtoSchema) })
  list(
    @Query({ schema: StylePresetListQuerySchema }) query: StylePresetListQuery,
  ): Promise<StylePresetDto[]> {
    return this.presets.list(query.templateId);
  }

  @Post()
  @ApiCreatedResponse({ standardSchema: StylePresetDtoSchema })
  create(
    @Body({ schema: CreateStylePresetRequestSchema }) body: CreateStylePresetRequest,
  ): Promise<StylePresetDto> {
    return this.presets.create(body);
  }

  @Get(':id')
  @ApiOkResponse({ standardSchema: StylePresetDtoSchema })
  get(@Param('id', ParseUUIDPipe) id: string): Promise<StylePresetDto> {
    return this.presets.get(id);
  }

  @Patch(':id')
  @ApiOkResponse({ standardSchema: StylePresetDtoSchema })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body({ schema: UpdateStylePresetRequestSchema }) body: UpdateStylePresetRequest,
  ): Promise<StylePresetDto> {
    return this.presets.update(id, body);
  }

  @Post(':id/default')
  @HttpCode(200)
  @ApiOkResponse({ standardSchema: StylePresetDtoSchema })
  setDefault(@Param('id', ParseUUIDPipe) id: string): Promise<StylePresetDto> {
    return this.presets.setDefault(id);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.presets.remove(id);
  }
}
