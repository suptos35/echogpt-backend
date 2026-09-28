import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { MessageRole, ProviderType } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { ProvidersService } from '../providers/providers.service';
import { AiProviderFactory } from './adapters/ai-provider.factory';
import { SendPromptDto } from './dto/send-prompt.dto';
import { SendPromptResponseDto } from './dto/send-prompt-response.dto';
import {
  ConversationSummaryDto,
  ConversationDetailDto,
} from './dto/conversation-response.dto';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionService: SubscriptionService,
    private readonly providersService: ProvidersService,
    private readonly aiProviderFactory: AiProviderFactory,
  ) {}

  /**
   * Process a chat prompt: enforces quota limits, persists history, and routes to appropriate AI provider
   */
  async sendPrompt(userId: string, dto: SendPromptDto): Promise<SendPromptResponseDto> {
    // 1. Quota Check & Decrement (strictly throws 429 TOO_MANY_REQUESTS if quota hit)
    await this.subscriptionService.consumeQuota(userId);

    // 2. Resolve AI Provider
    let provider: any;
    if (dto.providerId) {
      provider = await this.prisma.aiProvider.findUnique({
        where: { id: dto.providerId },
      });
      if (!provider) {
        throw new NotFoundException(`AI Provider '${dto.providerId}' not found`);
      }
    } else {
      provider = await this.providersService.getDefaultProvider();
    }

    if (!provider.isEnabled) {
      throw new BadRequestException(`AI Provider '${provider.displayName}' is currently disabled`);
    }

    // 3. Resolve API Key & Model
    const apiKey =
      (await this.providersService.getDecryptedApiKey(provider.id)) ||
      'mock-api-key';
    const model = dto.model || provider.defaultModel;

    // 4. Resolve or Create Conversation Thread
    let conversation: any;
    if (dto.conversationId) {
      conversation = await this.prisma.conversation.findFirst({
        where: { id: dto.conversationId, userId },
      });

      if (!conversation) {
        throw new NotFoundException(`Conversation '${dto.conversationId}' not found`);
      }
    } else {
      const title =
        dto.prompt.length > 50
          ? `${dto.prompt.slice(0, 50).trim()}...`
          : dto.prompt.trim();

      conversation = await this.prisma.conversation.create({
        data: {
          title,
          userId,
          providerId: provider.id,
          modelUsed: model,
        },
      });
    }

    // 5. Persist User Prompt Message
    await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: MessageRole.USER,
        content: dto.prompt,
      },
    });

    // 6. Fetch Recent History for Context
    const history = await this.prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
      take: 10,
    });

    const context = history.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // 7. Route through Pluggable Adapter
    const adapter = this.aiProviderFactory.getAdapter(provider.name);
    const completion = await adapter.generateCompletion(
      dto.prompt,
      model,
      apiKey,
      provider.baseUrl,
      context,
    );

    // 8. Persist Assistant Response Message
    const assistantMessage = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: MessageRole.ASSISTANT,
        content: completion.text,
        promptTokens: completion.promptTokens,
        completionTokens: completion.completionTokens,
        totalTokens: completion.totalTokens,
      },
    });

    // 9. Update Conversation Metadata
    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        updatedAt: new Date(),
        modelUsed: model,
        providerId: provider.id,
      },
    });

    this.logger.log(
      `Inference completed: user=${userId}, provider=${provider.name}, model=${model}, tokens=${completion.totalTokens}`,
    );

    return {
      conversationId: conversation.id,
      messageId: assistantMessage.id,
      response: completion.text,
      provider: provider.name,
      modelUsed: model,
      tokensUsed: {
        prompt: completion.promptTokens,
        completion: completion.completionTokens,
        total: completion.totalTokens,
      },
      createdAt: assistantMessage.createdAt,
    };
  }

  /**
   * Retrieve all conversation summaries for the authenticated user
   */
  async listConversations(userId: string): Promise<ConversationSummaryDto[]> {
    const conversations = await this.prisma.conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        provider: true,
        _count: {
          select: { messages: true },
        },
      },
    });

    return conversations.map((c) => ({
      id: c.id,
      title: c.title,
      modelUsed: c.modelUsed,
      providerName: c.provider?.displayName || null,
      messageCount: c._count?.messages || 0,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  }

  /**
   * Retrieve full conversation thread with ordered messages
   */
  async getConversation(userId: string, id: string): Promise<ConversationDetailDto> {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id, userId },
      include: {
        provider: true,
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation '${id}' not found`);
    }

    return {
      id: conversation.id,
      title: conversation.title,
      modelUsed: conversation.modelUsed,
      providerName: conversation.provider?.displayName || null,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      messages: conversation.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        promptTokens: m.promptTokens,
        completionTokens: m.completionTokens,
        totalTokens: m.totalTokens,
        createdAt: m.createdAt,
      })),
    };
  }

  /**
   * Delete an entire conversation thread and its associated messages
   */
  async deleteConversation(
    userId: string,
    id: string,
  ): Promise<{ success: boolean; message: string }> {
    const result = await this.prisma.conversation.deleteMany({
      where: { id, userId },
    });

    if (result.count === 0) {
      throw new NotFoundException(`Conversation '${id}' not found`);
    }

    this.logger.log(`Deleted conversation: ${id} for user ${userId}`);

    return {
      success: true,
      message: 'Conversation deleted successfully',
    };
  }
}
