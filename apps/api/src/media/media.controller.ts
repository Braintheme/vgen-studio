import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { MediaAssetDtoSchema, MediaFileQuerySchema, type MediaAssetDto } from '@vgen/shared';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { MediaService } from './media.service.js';

const MAX_FILES_PER_REQUEST = 10;

/** The fields of a multer disk-stored file that we use. */
interface UploadedDiskFile {
  readonly path: string;
  readonly originalname: string;
  readonly mimetype: string;
  readonly size: number;
}

const contentDisposition = (type: 'inline' | 'attachment', fileName: string): string =>
  `${type}; filename="${fileName.replace(/[^\x20-\x7e]|["\\]/g, '_')}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;

@ApiTags('media')
@Controller('media')
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post()
  @UseInterceptors(FilesInterceptor('files', MAX_FILES_PER_REQUEST))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { files: { type: 'array', items: { type: 'string', format: 'binary' } } },
    },
  })
  @ApiOkResponse({ standardSchema: z.array(MediaAssetDtoSchema) })
  upload(@UploadedFiles() files: UploadedDiskFile[] | undefined): Promise<MediaAssetDto[]> {
    return this.media.upload(
      (files ?? []).map((file) => ({
        path: file.path,
        // Multer decodes multipart file names as latin1.
        originalName: Buffer.from(file.originalname, 'latin1').toString('utf8'),
        mime: file.mimetype,
        size: file.size,
      })),
    );
  }

  @Get(':id')
  @ApiOkResponse({ standardSchema: MediaAssetDtoSchema })
  get(@Param('id', ParseUUIDPipe) id: string): Promise<MediaAssetDto> {
    return this.media.get(id);
  }

  /** Deletes an uploaded file (409 if a music track uses it). */
  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.media.deleteUpload(id);
  }

  /** The file itself; supports `Range` (audio/video seeking) and `?download=1`. */
  @Get(':id/file')
  async file(
    @Param('id', ParseUUIDPipe) id: string,
    @Query({ schema: MediaFileQuerySchema }) query: z.output<typeof MediaFileQuerySchema>,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const file = await this.media.openFile(id, query.variant, req.headers.range);
    res.setHeader('Content-Type', file.mime);
    res.setHeader('Accept-Ranges', 'bytes');
    // Asset files never change for a given id + variant.
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader(
      'Content-Disposition',
      contentDisposition(query.download ? 'attachment' : 'inline', file.fileName),
    );
    if (file.range) {
      res.status(206);
      res.setHeader('Content-Range', `bytes ${file.range.start}-${file.range.end}/${file.size}`);
      res.setHeader('Content-Length', file.range.end - file.range.start + 1);
    } else {
      res.status(200);
      res.setHeader('Content-Length', file.size);
    }
    file.stream.on('error', () => res.destroy());
    file.stream.pipe(res);
  }
}
