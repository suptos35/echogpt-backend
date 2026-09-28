import { ProviderType } from '@prisma/client';
import { AiResponse, ChatMessageContext } from './ai-response.interface';

export interface AiProviderAdapter {
  readonly providerType: ProviderType;

  generateCompletion(
    prompt: string,
    model: string,
    apiKey: string,
    baseUrl?: string | null,
    history?: ChatMessageContext[],
  ): Promise<AiResponse>;
}
