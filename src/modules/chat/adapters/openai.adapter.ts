import { Injectable, Logger } from '@nestjs/common';
import { ProviderType } from '@prisma/client';
import { AiProviderAdapter } from './ai-provider-adapter.interface';
import { AiResponse, ChatMessageContext } from './ai-response.interface';

@Injectable()
export class OpenAiAdapter implements AiProviderAdapter {
  readonly providerType = ProviderType.OPENAI;
  private readonly logger = new Logger(OpenAiAdapter.name);

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
      apiKey.startsWith('sk-test') ||
      process.env.NODE_ENV === 'test';

    if (isMock) {
      const mockText = `[OpenAI ${model}] Assistant response to: "${prompt}".`;
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

    const host = baseUrl || 'https://api.openai.com/v1';
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

    const response = await fetch(`${host}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      this.logger.error(`OpenAI API error: ${response.status} - ${errText}`);
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    const promptTokens = data.usage?.prompt_tokens || Math.ceil(prompt.length / 4);
    const completionTokens = data.usage?.completion_tokens || Math.ceil(text.length / 4);

    return {
      text,
      promptTokens,
      completionTokens,
      totalTokens: data.usage?.total_tokens || promptTokens + completionTokens,
      model,
    };
  }
}
