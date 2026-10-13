import { Body, Controller, Get, HttpCode, Param, Post, Res } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import {
  CreatePreviewRequestSchema,
  PreviewDtoSchema,
  PreviewKeySchema,
  type PreviewDto,
} from '@vgen/shared';
import type { Response } from 'express';
import type { z } from 'zod';
import { PreviewsService } from './previews.service.js';

@ApiTags('previews')
@Controller('previews')
export class PreviewsController {
  constructor(private readonly previews: PreviewsService) {}

  /** Renders (or reuses) a preview frame; for engines without a browser player. */
  @Post()
  @HttpCode(200)
  @ApiOkResponse({ standardSchema: PreviewDtoSchema })
  create(
    @Body({ schema: CreatePreviewRequestSchema }) body: z.output<typeof CreatePreviewRequestSchema>,
  ): Promise<PreviewDto> {
    return this.previews.create(body);
  }

  @Get(':key')
  async file(@Param('key', { schema: PreviewKeySchema }) key: string, @Res() res: Response): Promise<void> {
    const file = await this.previews.open(key);
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Content-Length', file.size);
    // Named by the hash of its content.
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    file.stream.on('error', () => res.destroy());
    file.stream.pipe(res);
  }
}
