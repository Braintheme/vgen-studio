import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import {
  CreateMusicTrackRequestSchema,
  MusicTrackDtoSchema,
  UpdateMusicTrackRequestSchema,
  type CreateMusicTrackRequest,
  type MusicTrackDto,
  type UpdateMusicTrackRequest,
} from '@vgen/shared';
import { z } from 'zod';
import { MusicService } from './music.service.js';

@ApiTags('music')
@Controller('music')
export class MusicController {
  constructor(private readonly music: MusicService) {}

  @Get()
  @ApiOkResponse({ standardSchema: z.array(MusicTrackDtoSchema) })
  list(): Promise<MusicTrackDto[]> {
    return this.music.list();
  }

  /** Registers an uploaded audio file (POST /media) as a library track. */
  @Post()
  @ApiCreatedResponse({ standardSchema: MusicTrackDtoSchema })
  create(
    @Body({ schema: CreateMusicTrackRequestSchema }) body: CreateMusicTrackRequest,
  ): Promise<MusicTrackDto> {
    return this.music.create(body);
  }

  @Get(':id')
  @ApiOkResponse({ standardSchema: MusicTrackDtoSchema })
  get(@Param('id', ParseUUIDPipe) id: string): Promise<MusicTrackDto> {
    return this.music.get(id);
  }

  @Patch(':id')
  @ApiOkResponse({ standardSchema: MusicTrackDtoSchema })
  rename(
    @Param('id', ParseUUIDPipe) id: string,
    @Body({ schema: UpdateMusicTrackRequestSchema }) body: UpdateMusicTrackRequest,
  ): Promise<MusicTrackDto> {
    return this.music.rename(id, body.title);
  }

  @Post(':id/default')
  @HttpCode(200)
  @ApiOkResponse({ standardSchema: MusicTrackDtoSchema })
  setDefault(@Param('id', ParseUUIDPipe) id: string): Promise<MusicTrackDto> {
    return this.music.setDefault(id);
  }

  /** Deletes the track together with its audio file. */
  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.music.remove(id);
  }
}
