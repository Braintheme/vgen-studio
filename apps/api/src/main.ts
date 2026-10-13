import 'reflect-metadata';
import { ConsoleLogger, Logger, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { z } from 'zod';
import { AppModule } from './app.module.js';
import { ApiExceptionFilter } from './common/api-exception.filter.js';
import { createValidationPipe } from './common/validation.js';
import { TypedConfigService } from './config/typed-config.service.js';

async function bootstrap(): Promise<void> {
  const json = process.env['LOG_FORMAT'] === 'json';
  const app = await NestFactory.create(AppModule, {
    logger: new ConsoleLogger({ json, colors: !json }),
  });
  const config = app.get(TypedConfigService);

  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new ApiExceptionFilter());
  app.enableShutdownHooks();
  const origins = config
    .get('CORS_ORIGINS')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (origins.length > 0) {
    app.enableCors({ origin: origins });
  }

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('vgen API')
      .setDescription(
        'Template-based video generation. All errors use `{ error: { code, message, details? } }`.',
      )
      .setVersion('1')
      .build(),
    {
      // Request/response schemas are zod (Standard Schema); render them as OpenAPI 3.0.
      standardSchemaConverter: (schema, { schemaType }) =>
        schema instanceof z.ZodType
          ? {
              schema: z.toJSONSchema(schema, {
                io: schemaType,
                target: 'openapi-3.0',
                unrepresentable: 'any',
              }),
            }
          : undefined,
    },
  );
  SwaggerModule.setup('api/docs', app, document);

  const port = config.get('API_PORT');
  await app.listen(port, '0.0.0.0');
  Logger.log(`API listening on :${port}`, 'Bootstrap');
}

void bootstrap();
