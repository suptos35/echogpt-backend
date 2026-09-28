import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { ProvidersModule } from '../providers/providers.module';
import { GeminiAdapter } from './adapters/gemini.adapter';
import { OpenAiAdapter } from './adapters/openai.adapter';
import { ClaudeAdapter } from './adapters/claude.adapter';
import { AiProviderFactory } from './adapters/ai-provider.factory';

@Module({
  imports: [PrismaModule, SubscriptionModule, ProvidersModule],
  controllers: [ChatController],
  providers: [
    GeminiAdapter,
    OpenAiAdapter,
    ClaudeAdapter,
    AiProviderFactory,
    ChatService,
  ],
  exports: [ChatService, AiProviderFactory],
})
export class ChatModule {}
