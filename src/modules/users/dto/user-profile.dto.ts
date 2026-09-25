import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubscriptionSummaryDto {
  @ApiProperty({ example: 'FREE', enum: ['FREE', 'PREMIUM'] })
  planType: string;

  @ApiProperty({ example: 'ACTIVE', enum: ['ACTIVE', 'CANCELLED', 'EXPIRED'] })
  status: string;

  @ApiProperty({ example: 20 })
  maxRequestsPerDay: number;

  @ApiProperty({ example: 3 })
  usedRequestsToday: number;

  @ApiPropertyOptional({ example: '2026-10-25T12:00:00.000Z' })
  expiresAt?: Date | null;
}

export class UserProfileDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef' })
  id: string;

  @ApiProperty({ example: 'user@echogpt.app' })
  email: string;

  @ApiPropertyOptional({ example: 'Jane' })
  firstName?: string | null;

  @ApiPropertyOptional({ example: 'Doe' })
  lastName?: string | null;

  @ApiProperty({ example: 'USER', enum: ['ADMIN', 'USER'] })
  role: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ type: SubscriptionSummaryDto })
  subscription: SubscriptionSummaryDto;

  @ApiProperty({ example: '2026-09-25T12:00:00.000Z' })
  createdAt: Date;
}
