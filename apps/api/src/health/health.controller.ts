import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Redis } from 'ioredis';
import { DataSource } from 'typeorm';
import { REDIS } from '../redis/redis.module.js';

type CheckResult = 'up' | 'down';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  @Get()
  async check(): Promise<{ status: 'ok'; checks: Record<string, CheckResult> }> {
    const [db, redis] = await Promise.all([this.checkDb(), this.checkRedis()]);
    const checks = { db, redis };
    if (db === 'down' || redis === 'down') {
      throw new ServiceUnavailableException({ status: 'error', checks });
    }
    return { status: 'ok', checks };
  }

  private async checkDb(): Promise<CheckResult> {
    try {
      await this.dataSource.query('SELECT 1');
      return 'up';
    } catch {
      return 'down';
    }
  }

  private async checkRedis(): Promise<CheckResult> {
    try {
      await this.redis.ping();
      return 'up';
    } catch {
      return 'down';
    }
  }
}
