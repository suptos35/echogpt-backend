import { ProviderType } from '@prisma/client';
import { GeminiAdapter } from './gemini.adapter';
import { OpenAiAdapter } from './openai.adapter';
import { ClaudeAdapter } from './claude.adapter';
import { AiProviderFactory } from './ai-provider.factory';

describe('AI Provider Adapters (Unit Tests)', () => {
  let geminiAdapter: GeminiAdapter;
  let openAiAdapter: OpenAiAdapter;
  let claudeAdapter: ClaudeAdapter;
  let factory: AiProviderFactory;

  beforeEach(() => {
    geminiAdapter = new GeminiAdapter();
    openAiAdapter = new OpenAiAdapter();
    claudeAdapter = new ClaudeAdapter();
    factory = new AiProviderFactory(
      geminiAdapter,
      openAiAdapter,
      claudeAdapter,
    );
  });

  describe('Factory', () => {
    it('should correctly return GeminiAdapter for GEMINI provider type', () => {
      const adapter = factory.getAdapter(ProviderType.GEMINI);
      expect(adapter).toBe(geminiAdapter);
      expect(adapter.providerType).toBe(ProviderType.GEMINI);
    });

    it('should correctly return OpenAiAdapter for OPENAI provider type', () => {
      const adapter = factory.getAdapter(ProviderType.OPENAI);
      expect(adapter).toBe(openAiAdapter);
      expect(adapter.providerType).toBe(ProviderType.OPENAI);
    });

    it('should correctly return ClaudeAdapter for CLAUDE provider type', () => {
      const adapter = factory.getAdapter(ProviderType.CLAUDE);
      expect(adapter).toBe(claudeAdapter);
      expect(adapter.providerType).toBe(ProviderType.CLAUDE);
    });
  });

  describe('GeminiAdapter', () => {
    it('should generate completion and return structured response in test/mock mode', async () => {
      const response = await geminiAdapter.generateCompletion(
        'What is TypeScript?',
        'gemini-1.5-flash',
        'mock-api-key',
      );

      expect(response).toBeDefined();
      expect(response.text).toContain('TypeScript');
      expect(response.model).toBe('gemini-1.5-flash');
      expect(response.promptTokens).toBeGreaterThan(0);
      expect(response.completionTokens).toBeGreaterThan(0);
      expect(response.totalTokens).toBe(
        response.promptTokens + response.completionTokens,
      );
    });
  });

  describe('OpenAiAdapter', () => {
    it('should generate completion and return structured response in test/mock mode', async () => {
      const response = await openAiAdapter.generateCompletion(
        'Hello OpenAI',
        'gpt-4o',
        'mock-api-key',
      );

      expect(response).toBeDefined();
      expect(response.text).toBeDefined();
      expect(response.model).toBe('gpt-4o');
      expect(response.totalTokens).toBeGreaterThan(0);
    });
  });

  describe('ClaudeAdapter', () => {
    it('should generate completion and return structured response in test/mock mode', async () => {
      const response = await claudeAdapter.generateCompletion(
        'Hello Claude',
        'claude-3-5-sonnet',
        'mock-api-key',
      );

      expect(response).toBeDefined();
      expect(response.text).toBeDefined();
      expect(response.model).toBe('claude-3-5-sonnet');
      expect(response.totalTokens).toBeGreaterThan(0);
    });
  });
});
