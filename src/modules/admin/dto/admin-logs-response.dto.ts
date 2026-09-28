import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationMetadataDto } from './admin-user-item.dto';

export class AdminLogItemDto {
  @ApiProperty({ example: 'log-uuid-123' })
  id: string;

  @ApiPropertyOptional({ example: 'user-uuid-123', nullable: true })
  userId: string | null;

  @ApiPropertyOptional({ example: 'user@example.com', nullable: true })
  userEmail: string | null;

  @ApiProperty({ example: '/api/chat/send-prompt' })
  endpoint: string;

  @ApiProperty({ example: 'POST' })
  method: string;

  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: 320 })
  latencyMs: number;

  @ApiPropertyOptional({ example: '127.0.0.1', nullable: true })
  ipAddress: string | null;

  @ApiPropertyOptional({ example: 'Mozilla/5.0...', nullable: true })
  userAgent: string | null;

  @ApiProperty({ example: '2026-09-25T12:00:00.000Z' })
  createdAt: Date;
}

export class AdminLogsResponseDto {
  @ApiProperty({ type: [AdminLogItemDto] })
  logs: AdminLogItemDto[];

  @ApiProperty({ type: PaginationMetadataDto })
  pagination: PaginationMetadataDto;
}
