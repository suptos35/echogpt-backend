import { Injectable, BadRequestException } from '@nestjs/common';
import { ProviderType } from '@prisma/client';
import { AiProviderAdapter } from './ai-provider-adapter.interface';
import { GeminiAdapter } from './gemini.adapter';
import { OpenAiAdapter } from './openai.adapter';
import { ClaudeAdapter } from './claude.adapter';

@Injectable()
export class AiProviderFactory {
  constructor(
    private readonly geminiAdapter: GeminiAdapter,
    private readonly openAiAdapter: OpenAiAdapter,
    private readonly claudeAdapter: ClaudeAdapter,
  ) {}

  getAdapter(type: ProviderType): AiProviderAdapter {
    switch (type) {
      case ProviderType.GEMINI:
        return this.geminiAdapter;
      case ProviderType.OPENAI:
        return this.openAiAdapter;
      case ProviderType.CLAUDE:
        return this.claudeAdapter;
      default:
        throw new BadRequestException(`Unsupported AI Provider: ${type}`);
    }
  }
}
