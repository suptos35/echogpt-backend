import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PlanType, SubscriptionStatus } from '@prisma/client';

export class SubscriptionStatusDto {
  @ApiProperty({
    description: 'Current subscription plan tier',
    enum: PlanType,
    example: PlanType.FREE,
  })
  planType: PlanType;

  @ApiProperty({
    description: 'Status of the subscription',
    enum: SubscriptionStatus,
    example: SubscriptionStatus.ACTIVE,
  })
  status: SubscriptionStatus;

  @ApiProperty({
    description: 'Maximum allowable requests per 24-hour cycle',
    example: 20,
  })
  maxRequestsPerDay: number;

  @ApiProperty({
    description: 'Number of requests consumed today',
    example: 5,
  })
  usedRequestsToday: number;

  @ApiProperty({
    description: 'Number of queries remaining before limit enforcement',
    example: 15,
  })
  remainingRequests: number;

  @ApiProperty({
    description: 'Date when the subscription period started',
    example: '2026-09-25T12:00:00.000Z',
  })
  startDate: Date;

  @ApiProperty({
    description: 'Date and time of the last daily quota reset',
    example: '2026-09-29T00:00:00.000Z',
  })
  lastResetDate: Date;

  @ApiPropertyOptional({
    description: 'Expiration date of premium subscription (null for free tier)',
    example: '2026-10-25T12:00:00.000Z',
    nullable: true,
  })
  expiresAt: Date | null;
}

export class RemainingRequestsDto {
  @ApiProperty({
    description: 'Total number of queries remaining today',
    example: 20,
  })
  remainingRequests: number;
}
