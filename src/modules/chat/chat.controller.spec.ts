import { Test, TestingModule } from '@nestjs/testing';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

describe('ChatController', () => {
  let controller: ChatController;
  let chatService: any;

  const mockResponse = {
    conversationId: 'conv-1',
    messageId: 'msg-2',
    response: 'Hello, how can I help you today?',
    modelUsed: 'gemini-1.5-flash',
    promptTokens: 10,
    completionTokens: 20,
    totalTokens: 30,
    remainingDailyRequests: 19,
  };

  const mockChatService = {
    sendPrompt: jest.fn(),
    listConversations: jest.fn(),
    getConversation: jest.fn(),
    deleteConversation: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [
        {
          provide: ChatService,
          useValue: mockChatService,
        },
      ],
    }).compile();

    controller = module.get<ChatController>(ChatController);
    chatService = module.get(ChatService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('sendPrompt', () => {
    it('should process prompt and return AI completion', async () => {
      mockChatService.sendPrompt.mockResolvedValue(mockResponse);

      const dto = { prompt: 'Hi' };
      const result = await controller.sendPrompt('user-1', dto);

      expect(result).toEqual(mockResponse);
      expect(chatService.sendPrompt).toHaveBeenCalledWith('user-1', dto);
    });
  });

  describe('listConversations', () => {
    it('should list all conversations for user', async () => {
      mockChatService.listConversations.mockResolvedValue([
        {
          id: 'conv-1',
          title: 'Hi',
          modelUsed: 'gemini-1.5-flash',
          messageCount: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await controller.listConversations('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('conv-1');
      expect(chatService.listConversations).toHaveBeenCalledWith('user-1');
    });
  });

  describe('getConversation', () => {
    it('should retrieve conversation thread with messages', async () => {
      mockChatService.getConversation.mockResolvedValue({
        id: 'conv-1',
        title: 'Hi',
        messages: [],
      });

      const result = await controller.getConversation('user-1', 'conv-1');

      expect(result.id).toBe('conv-1');
      expect(chatService.getConversation).toHaveBeenCalledWith(
        'user-1',
        'conv-1',
      );
    });
  });

  describe('deleteConversation', () => {
    it('should delete conversation thread', async () => {
      mockChatService.deleteConversation.mockResolvedValue({
        success: true,
        message: 'Conversation deleted successfully',
      });

      const result = await controller.deleteConversation('user-1', 'conv-1');

      expect(result.success).toBe(true);
      expect(chatService.deleteConversation).toHaveBeenCalledWith(
        'user-1',
        'conv-1',
      );
    });
  });
});
