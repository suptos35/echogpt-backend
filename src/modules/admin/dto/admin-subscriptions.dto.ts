import { ApiProperty } from '@nestjs/swagger';
import { PlanType, SubscriptionStatus } from '@prisma/client';

export class AdminSubscriptionsSummaryDto {
  @ApiProperty({ example: 45 })
  total: number;

  @ApiProperty({ example: 35 })
  free: number;

  @ApiProperty({ example: 10 })
  premium: number;

  @ApiProperty({ example: 44 })
  active: number;

  @ApiProperty({ example: 1 })
  cancelled: number;

  @ApiProperty({ example: 0 })
  expired: number;
}

export class AdminSubscriptionItemDto {
  @ApiProperty({ example: 'sub-uuid-123' })
  id: string;

  @ApiProperty({ example: 'user-uuid-123' })
  userId: string;

  @ApiProperty({ example: 'user@example.com' })
  userEmail: string;

  @ApiProperty({ example: 'John Doe' })
  userName: string;

  @ApiProperty({ enum: PlanType, example: PlanType.PREMIUM })
  planType: PlanType;

  @ApiProperty({ enum: SubscriptionStatus, example: SubscriptionStatus.ACTIVE })
  status: SubscriptionStatus;

  @ApiProperty({ example: 500 })
  maxRequestsPerDay: number;

  @ApiProperty({ example: 42 })
  usedRequestsToday: number;

  @ApiProperty({ example: '2026-09-25T12:00:00.000Z' })
  lastResetDate: Date;

  @ApiProperty({ example: null, nullable: true })
  expiresAt: Date | null;
}

export class AdminSubscriptionsResponseDto {
  @ApiProperty({ type: AdminSubscriptionsSummaryDto })
  summary: AdminSubscriptionsSummaryDto;

  @ApiProperty({ type: [AdminSubscriptionItemDto] })
  subscriptions: AdminSubscriptionItemDto[];
}
