import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import {
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
  MemoryHealthIndicator,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { Public } from '../auth/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

// Past this, liveness fails so the platform restarts a process that's leaking.
const HEAP_LIMIT_BYTES = 512 * 1024 * 1024;
const DATABASE_TIMEOUT_MS = 2000;

/**
 * Probes for the hosting platform and uptime monitors. Public and not
 * rate-limited. Both answer 200 when healthy and 503 when not. See
 * docs/operations.md.
 */
@ApiTags('health')
@Public()
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly memory: MemoryHealthIndicator,
    private readonly database: PrismaHealthIndicator,
    private readonly prisma: PrismaService,
  ) {}

  /** Checks nothing outside the process, so a database outage doesn't restart the API. */
  @Get('live')
  @HealthCheck()
  @ApiOperation({ summary: 'Liveness: the process is up' })
  live(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.memory.checkHeap('memory_heap', HEAP_LIMIT_BYTES),
    ]);
  }

  @Get('ready')
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness: the API can reach the database' })
  ready(): Promise<HealthCheckResult> {
    return this.health.check([
      () =>
        this.database.pingCheck('database', this.prisma, {
          timeout: DATABASE_TIMEOUT_MS,
        }),
    ]);
  }
}
