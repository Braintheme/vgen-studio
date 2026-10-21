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
  Req,
  Res,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import {
  BulkDeleteMediaRequestSchema,
  BulkDeleteMediaResponseSchema,
  MAX_UPLOAD_FILES_PER_REQUEST,
  MediaAssetDtoSchema,
  MediaCleanupRequestSchema,
  MediaCleanupResponseSchema,
  MediaFileQuerySchema,
  MediaLibraryPageSchema,
  MediaLibraryQuerySchema,
  type BulkDeleteMediaResponse,
  type MediaAssetDto,
  type MediaCleanupResponse,
  type MediaLibraryPage,
} from '@vgen/shared';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { contentDisposition } from '../common/content-disposition.js';
import { MediaService } from './media.service.js';

/** The fields of a multer disk-stored file that we use. */
interface UploadedDiskFile {
  readonly path: string;
  readonly originalname: string;
  readonly mimetype: string;
  readonly size: number;
}

@ApiTags('media')
@Controller('media')
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post()
  @UseInterceptors(FilesInterceptor('files', MAX_UPLOAD_FILES_PER_REQUEST))
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

  /** The library: uploaded photos and videos (newest first by default), with their use. */
  @Get()
  @ApiOkResponse({ standardSchema: MediaLibraryPageSchema })
  list(
    @Query({ schema: MediaLibraryQuerySchema }) query: z.output<typeof MediaLibraryQuerySchema>,
  ): Promise<MediaLibraryPage> {
    return this.media.listLibrary(query);
  }

  /** Deletes several uploads at once; the ones that cannot go are listed in `failed`. */
  @Post('bulk-delete')
  @HttpCode(200)
  @ApiOkResponse({ standardSchema: BulkDeleteMediaResponseSchema })
  bulkDelete(
    @Body({ schema: BulkDeleteMediaRequestSchema }) body: z.output<typeof BulkDeleteMediaRequestSchema>,
  ): Promise<BulkDeleteMediaResponse> {
    return this.media.deleteUploads(body.ids);
  }

  /** Counts (dry run) or deletes the unused photos and videos older than N days. */
  @Post('cleanup')
  @HttpCode(200)
  @ApiOkResponse({ standardSchema: MediaCleanupResponseSchema })
  cleanup(
    @Body({ schema: MediaCleanupRequestSchema }) body: z.output<typeof MediaCleanupRequestSchema>,
  ): Promise<MediaCleanupResponse> {
    return this.media.cleanup(body);
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
