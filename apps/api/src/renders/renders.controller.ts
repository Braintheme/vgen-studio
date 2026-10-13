import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Sse,
  type MessageEvent,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import {
  CreateRenderRequestSchema,
  CreateRenderResponseSchema,
  DuplicateRenderResponseSchema,
  paginated,
  RenderJobDtoSchema,
  RenderListQuerySchema,
  type CreateRenderResponse,
  type DuplicateRenderResponse,
  type Paginated,
  type RenderJobDto,
} from '@vgen/shared';
import type { Observable } from 'rxjs';
import type { z } from 'zod';
import { RendersService } from './renders.service.js';

@ApiTags('renders')
@Controller('renders')
export class RendersController {
  constructor(private readonly renders: RendersService) {}

  @Post()
  @ApiCreatedResponse({ standardSchema: CreateRenderResponseSchema })
  create(
    @Body({ schema: CreateRenderRequestSchema }) body: z.output<typeof CreateRenderRequestSchema>,
  ): Promise<CreateRenderResponse> {
    return this.renders.create(body);
  }

  @Get()
  @ApiOkResponse({ standardSchema: paginated(RenderJobDtoSchema) })
  list(
    @Query({ schema: RenderListQuerySchema }) query: z.output<typeof RenderListQuerySchema>,
  ): Promise<Paginated<RenderJobDto>> {
    return this.renders.list(query);
  }

  /** Server-sent events for every render (status and progress). Declared before `:id`. */
  @Sse('events')
  watchAll(): Observable<MessageEvent> {
    return this.renders.watchAll();
  }

  @Get(':id')
  @ApiOkResponse({ standardSchema: RenderJobDtoSchema })
  get(@Param('id', ParseUUIDPipe) id: string): Promise<RenderJobDto> {
    return this.renders.get(id);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  @ApiOkResponse({ standardSchema: RenderJobDtoSchema })
  cancel(@Param('id', ParseUUIDPipe) id: string): Promise<RenderJobDto> {
    return this.renders.cancel(id);
  }

  /** Deletes a finished render with its files (409 while queued or rendering). */
  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.renders.remove(id);
  }

  @Post(':id/duplicate')
  @ApiCreatedResponse({ standardSchema: DuplicateRenderResponseSchema })
  duplicate(@Param('id', ParseUUIDPipe) id: string): Promise<DuplicateRenderResponse> {
    return this.renders.duplicate(id);
  }

  /** Server-sent events for one render: a status snapshot, then live updates. */
  @Sse(':id/events')
  watch(@Param('id', ParseUUIDPipe) id: string): Observable<MessageEvent> {
    return this.renders.watch(id);
  }
}
