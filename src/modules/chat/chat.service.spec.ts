import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { ProviderType, MessageRole } from '@prisma/client';
import { ChatService } from './chat.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { ProvidersService } from '../providers/providers.service';
import { AiProviderFactory } from './adapters/ai-provider.factory';

describe('ChatService (Unit Tests)', () => {
  let service: ChatService;
  let prisma: any;
  let subscriptionService: any;
  let providersService: any;
  let factory: any;
  let mockAdapter: any;

  const mockProvider = {
    id: 'prov-gemini',
    name: ProviderType.GEMINI,
    displayName: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com',
    defaultModel: 'gemini-1.5-flash',
    isEnabled: true,
    isDefault: true,
  };

  const mockConversation = {
    id: 'conv-1',
    title: 'What is NestJS?',
    userId: 'user-1',
    providerId: 'prov-gemini',
    modelUsed: 'gemini-1.5-flash',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      conversation: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
      },
      message: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
    };

    subscriptionService = {
      consumeQuota: jest
        .fn()
        .mockResolvedValue({ allowed: true, remainingRequests: 19 }),
    };

    providersService = {
      getDefaultProvider: jest.fn().mockResolvedValue(mockProvider),
      getProviderById: jest.fn().mockResolvedValue(mockProvider),
      getDecryptedApiKey: jest.fn().mockResolvedValue('mock-decrypted-key'),
    };

    mockAdapter = {
      providerType: ProviderType.GEMINI,
      generateCompletion: jest.fn().mockResolvedValue({
        text: 'NestJS is a progressive Node.js framework.',
        promptTokens: 10,
        completionTokens: 15,
        totalTokens: 25,
        model: 'gemini-1.5-flash',
      }),
    };

    factory = {
      getAdapter: jest.fn().mockReturnValue(mockAdapter),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: PrismaService, useValue: prisma },
        { provide: SubscriptionService, useValue: subscriptionService },
        { provide: ProvidersService, useValue: providersService },
        { provide: AiProviderFactory, useValue: factory },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendPrompt', () => {
    it('should check quota, create conversation, save messages, and return response', async () => {
      prisma.conversation.create.mockResolvedValue(mockConversation);
      prisma.message.create
        .mockResolvedValueOnce({
          id: 'msg-user-1',
          role: MessageRole.USER,
          content: 'What is NestJS?',
        })
        .mockResolvedValueOnce({
          id: 'msg-asst-1',
          role: MessageRole.ASSISTANT,
          content: 'NestJS is a progressive Node.js framework.',
          totalTokens: 25,
        });
      prisma.message.findMany.mockResolvedValue([]);

      const result = await service.sendPrompt('user-1', {
        prompt: 'What is NestJS?',
      });

      expect(subscriptionService.consumeQuota).toHaveBeenCalledWith('user-1');
      expect(prisma.conversation.create).toHaveBeenCalled();
      expect(mockAdapter.generateCompletion).toHaveBeenCalled();
      expect(result.response).toContain('NestJS is a progressive');
      expect(result.tokensUsed.total).toBe(25);
      expect(result.provider).toBe(ProviderType.GEMINI);
    });

    it('should throw 429 Too Many Requests if user quota is exhausted', async () => {
      subscriptionService.consumeQuota.mockRejectedValue(
        new HttpException(
          'Daily request quota exhausted',
          HttpStatus.TOO_MANY_REQUESTS,
        ),
      );

      await expect(
        service.sendPrompt('user-1', { prompt: 'Exhausted request' }),
      ).rejects.toThrow(HttpException);
      expect(prisma.conversation.create).not.toHaveBeenCalled();
      expect(mockAdapter.generateCompletion).not.toHaveBeenCalled();
    });

    it('should append to existing conversation if conversationId is provided', async () => {
      prisma.conversation.findFirst.mockResolvedValue(mockConversation);
      prisma.message.create
        .mockResolvedValueOnce({ id: 'msg-user-2', role: MessageRole.USER })
        .mockResolvedValueOnce({
          id: 'msg-asst-2',
          role: MessageRole.ASSISTANT,
          totalTokens: 20,
        });
      prisma.message.findMany.mockResolvedValue([
        { role: MessageRole.USER, content: 'What is NestJS?' },
        {
          role: MessageRole.ASSISTANT,
          content: 'NestJS is a Node.js framework.',
        },
      ]);
      prisma.conversation.update.mockResolvedValue(mockConversation);

      const result = await service.sendPrompt('user-1', {
        prompt: 'How to install it?',
        conversationId: 'conv-1',
      });

      expect(prisma.conversation.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'conv-1', userId: 'user-1' } }),
      );
      expect(prisma.conversation.create).not.toHaveBeenCalled();
      expect(result.conversationId).toBe('conv-1');
    });
  });

  describe('listConversations', () => {
    it('should return all conversations for authenticated user', async () => {
      prisma.conversation.findMany.mockResolvedValue([mockConversation]);

      const list = await service.listConversations('user-1');

      expect(list).toHaveLength(1);
      expect(list[0].id).toBe('conv-1');
    });
  });

  describe('getConversation', () => {
    it('should return conversation with messages', async () => {
      prisma.conversation.findFirst.mockResolvedValue({
        ...mockConversation,
        messages: [{ id: 'msg-1', content: 'Hello', role: MessageRole.USER }],
      });

      const conv = await service.getConversation('user-1', 'conv-1');

      expect(conv.id).toBe('conv-1');
      expect(conv.messages).toHaveLength(1);
    });

    it('should throw NotFoundException if conversation not found or belongs to another user', async () => {
      prisma.conversation.findFirst.mockResolvedValue(null);

      await expect(
        service.getConversation('user-1', 'invalid-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteConversation', () => {
    it('should delete conversation and return success', async () => {
      prisma.conversation.deleteMany.mockResolvedValue({ count: 1 });

      const res = await service.deleteConversation('user-1', 'conv-1');

      expect(res.success).toBe(true);
      expect(prisma.conversation.deleteMany).toHaveBeenCalledWith({
        where: { id: 'conv-1', userId: 'user-1' },
      });
    });
  });
});
