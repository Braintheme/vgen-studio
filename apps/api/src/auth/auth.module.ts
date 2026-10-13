import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ClsModule } from 'nestjs-cls';
import { AuthGuard } from './auth.guard.js';
import { RequestContextService } from './request-context.service.js';

@Global()
@Module({
  imports: [ClsModule.forRoot({ global: true, middleware: { mount: true } })],
  providers: [{ provide: APP_GUARD, useClass: AuthGuard }, RequestContextService],
  exports: [RequestContextService],
})
export class AuthModule {}
