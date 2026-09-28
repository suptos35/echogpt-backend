import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageRole } from '@prisma/client';

export class MessageItemDto {
  @ApiProperty({ example: 'msg-uuid-1' })
  id: string;

  @ApiProperty({ enum: MessageRole, example: MessageRole.USER })
  role: MessageRole;

  @ApiProperty({ example: 'What is NestJS?' })
  content: string;

  @ApiPropertyOptional({ example: 10, nullable: true })
  promptTokens?: number | null;

  @ApiPropertyOptional({ example: 25, nullable: true })
  completionTokens?: number | null;

  @ApiPropertyOptional({ example: 35, nullable: true })
  totalTokens?: number | null;

  @ApiProperty({ example: '2026-09-29T12:00:00.000Z' })
  createdAt: Date;
}

export class ConversationSummaryDto {
  @ApiProperty({ example: 'conv-uuid-1' })
  id: string;

  @ApiProperty({ example: 'What is NestJS?' })
  title: string;

  @ApiPropertyOptional({ example: 'gemini-1.5-flash', nullable: true })
  modelUsed?: string | null;

  @ApiPropertyOptional({ example: 'Google Gemini (Free Tier Default)', nullable: true })
  providerName?: string | null;

  @ApiProperty({ example: 4, description: 'Total message count in this conversation thread' })
  messageCount: number;

  @ApiProperty({ example: '2026-09-29T12:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-09-29T12:05:00.000Z' })
  updatedAt: Date;
}

export class ConversationDetailDto {
  @ApiProperty({ example: 'conv-uuid-1' })
  id: string;

  @ApiProperty({ example: 'What is NestJS?' })
  title: string;

  @ApiPropertyOptional({ example: 'gemini-1.5-flash', nullable: true })
  modelUsed?: string | null;

  @ApiPropertyOptional({ example: 'Google Gemini (Free Tier Default)', nullable: true })
  providerName?: string | null;

  @ApiProperty({ type: [MessageItemDto] })
  messages: MessageItemDto[];

  @ApiProperty({ example: '2026-09-29T12:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-09-29T12:05:00.000Z' })
  updatedAt: Date;
}
