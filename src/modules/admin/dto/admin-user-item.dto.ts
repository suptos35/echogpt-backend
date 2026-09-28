import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RoleName, PlanType, SubscriptionStatus } from '@prisma/client';

export class AdminUserSubscriptionDto {
  @ApiProperty({ enum: PlanType, example: PlanType.FREE })
  planType: PlanType;

  @ApiProperty({ enum: SubscriptionStatus, example: SubscriptionStatus.ACTIVE })
  status: SubscriptionStatus;

  @ApiProperty({ example: 20 })
  maxRequestsPerDay: number;

  @ApiProperty({ example: 5 })
  usedRequestsToday: number;
}

export class AdminUserItemDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiPropertyOptional({ example: 'John' })
  firstName: string | null;

  @ApiPropertyOptional({ example: 'Doe' })
  lastName: string | null;

  @ApiProperty({ enum: RoleName, example: RoleName.USER })
  role: RoleName;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: true })
  isVerified: boolean;

  @ApiPropertyOptional({ type: AdminUserSubscriptionDto })
  subscription: AdminUserSubscriptionDto | null;

  @ApiProperty({ example: '2026-09-25T12:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-09-25T12:00:00.000Z' })
  updatedAt: Date;
}

export class PaginationMetadataDto {
  @ApiProperty({ example: 50 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 5 })
  totalPages: number;
}

export class AdminUsersListResponseDto {
  @ApiProperty({ type: [AdminUserItemDto] })
  users: AdminUserItemDto[];

  @ApiProperty({ type: PaginationMetadataDto })
  pagination: PaginationMetadataDto;
}
