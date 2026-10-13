import { Module } from '@nestjs/common';
import { EnginesController } from './engines.controller.js';

@Module({ controllers: [EnginesController] })
export class EnginesModule {}
