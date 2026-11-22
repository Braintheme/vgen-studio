import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import {
  CreateMediaGroupRequestSchema,
  MediaGroupDtoSchema,
  UpdateMediaGroupRequestSchema,
  type MediaGroupDto,
} from '@vgen/shared';
import { z } from 'zod';
import { MediaGroupsService } from './media-groups.service.js';

/** Named sets of library files (e.g. a preset's settings screenshots). */
@ApiTags('media')
@Controller('media-groups')
export class MediaGroupsController {
  constructor(private readonly groups: MediaGroupsService) {}

  /** Every group, newest first, each with its files in name order. */
  @Get()
  @ApiOkResponse({ standardSchema: z.array(MediaGroupDtoSchema) })
  list(): Promise<MediaGroupDto[]> {
    return this.groups.list();
  }

  @Post()
  @ApiCreatedResponse({ standardSchema: MediaGroupDtoSchema })
  create(
    @Body({ schema: CreateMediaGroupRequestSchema }) body: z.output<typeof CreateMediaGroupRequestSchema>,
  ): Promise<MediaGroupDto> {
    return this.groups.create(body);
  }

  @Get(':id')
  @ApiOkResponse({ standardSchema: MediaGroupDtoSchema })
  get(@Param('id', ParseUUIDPipe) id: string): Promise<MediaGroupDto> {
    return this.groups.get(id);
  }

  /** Rename, add files, remove files. */
  @Patch(':id')
  @ApiOkResponse({ standardSchema: MediaGroupDtoSchema })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body({ schema: UpdateMediaGroupRequestSchema }) body: z.output<typeof UpdateMediaGroupRequestSchema>,
  ): Promise<MediaGroupDto> {
    return this.groups.update(id, body);
  }

  /** Deletes the group; its files stay in the library. */
  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.groups.remove(id);
  }
}
