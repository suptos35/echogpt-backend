import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsArray,
} from 'class-validator';
import { ProviderType } from '@prisma/client';

export class CreateProviderDto {
  @ApiProperty({
    enum: ProviderType,
    description: 'Unique AI Provider identifier',
    example: ProviderType.OPENAI,
  })
  @IsEnum(ProviderType)
  name: ProviderType;

  @ApiProperty({
    description: 'Human-readable name of the provider',
    example: 'OpenAI GPT Models',
  })
  @IsString()
  @IsNotEmpty()
  displayName: string;

  @ApiPropertyOptional({
    description: 'Custom base URL endpoint for provider API calls',
    example: 'https://api.openai.com/v1',
  })
  @IsOptional()
  @IsString()
  baseUrl?: string;

  @ApiPropertyOptional({
    description:
      'Raw API key — will be encrypted with AES-256 before database persistence',
    example: 'sk-proj-example-secret-key',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  apiKey?: string;

  @ApiProperty({
    description: 'Default model name to use when user does not specify one',
    example: 'gpt-4o',
  })
  @IsString()
  @IsNotEmpty()
  defaultModel: string;

  @ApiProperty({
    description: 'List of model names available under this provider',
    example: ['gpt-4o', 'gpt-4o-mini', 'o1'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  availableModels: string[];

  @ApiPropertyOptional({
    description: 'Whether the provider is currently enabled for chat calls',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Whether this provider is designated as the system default',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
