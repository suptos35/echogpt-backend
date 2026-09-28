import { ApiProperty } from '@nestjs/swagger';

export class HealthDatabaseMetricDto {
  @ApiProperty({ example: 'connected', enum: ['connected', 'disconnected'] })
  status: 'connected' | 'disconnected';

  @ApiProperty({
    example: 4,
    description: 'Ping roundtrip latency in milliseconds',
  })
  latencyMs: number;
}

export class HealthMemoryMetricDto {
  @ApiProperty({ example: 145.2, description: 'Resident Set Size in MB' })
  rssMb: number;

  @ApiProperty({ example: 85.5, description: 'Total V8 heap in MB' })
  heapTotalMb: number;

  @ApiProperty({ example: 62.3, description: 'Used V8 heap in MB' })
  heapUsedMb: number;

  @ApiProperty({ example: 25.1, description: 'External memory in MB' })
  externalMb: number;
}

export class HealthProcessMetricDto {
  @ApiProperty({ example: 'v22.14.0' })
  nodeVersion: string;

  @ApiProperty({ example: 'linux' })
  platform: string;

  @ApiProperty({ example: 12345 })
  pid: number;
}

export class AdminSystemHealthDto {
  @ApiProperty({
    example: 'healthy',
    enum: ['healthy', 'degraded', 'unhealthy'],
  })
  status: 'healthy' | 'degraded' | 'unhealthy';

  @ApiProperty({ example: '2026-09-25T12:00:00.000Z' })
  timestamp: string;

  @ApiProperty({ example: 3600, description: 'Process uptime in seconds' })
  uptime: number;

  @ApiProperty({ type: HealthDatabaseMetricDto })
  database: HealthDatabaseMetricDto;

  @ApiProperty({ type: HealthMemoryMetricDto })
  memory: HealthMemoryMetricDto;

  @ApiProperty({ type: HealthProcessMetricDto })
  process: HealthProcessMetricDto;
}
