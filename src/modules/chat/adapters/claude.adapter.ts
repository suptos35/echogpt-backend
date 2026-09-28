import { Injectable, Logger } from '@nestjs/common';
import { ProviderType } from '@prisma/client';
import { AiProviderAdapter } from './ai-provider-adapter.interface';
import { AiResponse, ChatMessageContext } from './ai-response.interface';

@Injectable()
export class ClaudeAdapter implements AiProviderAdapter {
  readonly providerType = ProviderType.CLAUDE;
  private readonly logger = new Logger(ClaudeAdapter.name);

  async generateCompletion(
    prompt: string,
    model: string,
    apiKey: string,
    baseUrl?: string | null,
    history?: ChatMessageContext[],
  ): Promise<AiResponse> {
    const isMock =
      !apiKey ||
      apiKey.startsWith('mock') ||
      apiKey.startsWith('sk-ant') ||
      process.env.NODE_ENV === 'test';

    if (isMock) {
      const mockText = `[Claude ${model}] Comprehensive response to: "${prompt}".`;
      const promptTokens = Math.ceil(prompt.length / 4);
      const completionTokens = Math.ceil(mockText.length / 4);

      return {
        text: mockText,
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        model,
      };
    }

    const host = baseUrl || 'https://api.anthropic.com/v1';
    const messages: any[] = [];
    if (history && history.length > 0) {
      for (const msg of history) {
        messages.push({
          role: msg.role === 'USER' ? 'user' : 'assistant',
          content: msg.content,
        });
      }
    }
    messages.push({ role: 'user', content: prompt });

    const response = await fetch(`${host}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        messages,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      this.logger.error(`Claude API error: ${response.status} - ${errText}`);
      throw new Error(`Anthropic Claude API error: ${response.statusText}`);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    const promptTokens =
      data.usage?.input_tokens || Math.ceil(prompt.length / 4);
    const completionTokens =
      data.usage?.output_tokens || Math.ceil(text.length / 4);

    return {
      text,
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      model,
    };
  }
}
