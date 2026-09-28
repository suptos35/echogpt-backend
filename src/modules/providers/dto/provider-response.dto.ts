import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProviderType } from '@prisma/client';

export class ProviderResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ enum: ProviderType, example: ProviderType.GEMINI })
  name: ProviderType;

  @ApiProperty({ example: 'Google Gemini (Free Tier Default)' })
  displayName: string;

  @ApiPropertyOptional({
    example: 'https://generativelanguage.googleapis.com',
    nullable: true,
  })
  baseUrl: string | null;

  @ApiProperty({ example: true })
  isEnabled: boolean;

  @ApiProperty({ example: true })
  isDefault: boolean;

  @ApiProperty({ example: 'gemini-1.5-flash' })
  defaultModel: string;

  @ApiProperty({
    example: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash'],
    isArray: true,
  })
  availableModels: string[];

  @ApiProperty({
    description:
      'Indicates whether an encrypted API key is currently configured for this provider',
    example: true,
  })
  hasApiKey: boolean;

  @ApiProperty({ example: '2026-09-25T12:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-09-29T12:00:00.000Z' })
  updatedAt: Date;
}
