import { Module } from '@nestjs/common';
import { RenderQueueService } from './render-queue.service.js';

@Module({ providers: [RenderQueueService], exports: [RenderQueueService] })
export class QueueModule {}
