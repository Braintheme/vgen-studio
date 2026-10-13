import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module.js';
import { QueueModule } from '../queue/queue.module.js';
import { PreviewsController } from './previews.controller.js';
import { PreviewsService } from './previews.service.js';

@Module({
  imports: [MediaModule, QueueModule],
  controllers: [PreviewsController],
  providers: [PreviewsService],
})
export class PreviewsModule {}
