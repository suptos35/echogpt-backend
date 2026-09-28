import { ApiProperty } from '@nestjs/swagger';
import { ProviderType } from '@prisma/client';

export class ProviderHealthDto {
  @ApiProperty({
    enum: ['healthy', 'unhealthy', 'degraded'],
    example: 'healthy',
  })
  status: 'healthy' | 'unhealthy' | 'degraded';

  @ApiProperty({ enum: ProviderType, example: ProviderType.GEMINI })
  provider: ProviderType;

  @ApiProperty({ example: 45, description: 'Response latency in milliseconds' })
  latencyMs: number;

  @ApiProperty({ example: '2026-09-29T12:00:00.000Z' })
  timestamp: string;

  @ApiProperty({ example: 'Provider operational with active credentials' })
  message: string;
}
