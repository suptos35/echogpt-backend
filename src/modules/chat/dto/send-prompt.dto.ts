import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class SendPromptDto {
  @ApiProperty({
    description: 'The natural language prompt or question to ask the AI model',
    example: 'Explain the benefits of TypeScript for backend REST APIs.',
  })
  @IsString()
  @IsNotEmpty()
  prompt: string;

  @ApiPropertyOptional({
    description: 'UUID of an existing conversation to continue the thread. If omitted, a new conversation is started.',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsOptional()
  @IsUUID()
  conversationId?: string;

  @ApiPropertyOptional({
    description: 'UUID of the preferred AI provider. If omitted, system default provider is used.',
    example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  })
  @IsOptional()
  @IsUUID()
  providerId?: string;

  @ApiPropertyOptional({
    description: 'Target model name (e.g. gemini-1.5-flash, gpt-4o, claude-3-5-sonnet). If omitted, provider default is used.',
    example: 'gemini-1.5-flash',
  })
  @IsOptional()
  @IsString()
  model?: string;
}
