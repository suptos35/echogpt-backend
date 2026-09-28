import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ChatService } from './chat.service';
import { SendPromptDto } from './dto/send-prompt.dto';
import { SendPromptResponseDto } from './dto/send-prompt-response.dto';
import {
  ConversationSummaryDto,
  ConversationDetailDto,
} from './dto/conversation-response.dto';

@ApiTags('Chat API')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('api/chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('send-prompt')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send prompt to AI model',
    description: 'Routes prompt through selected or default AI provider, decrements daily subscription quota, and records message history.',
  })
  @ApiResponse({
    status: 200,
    description: 'AI model completion response and token usage metrics',
    type: SendPromptResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid prompt payload or disabled provider' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 429, description: 'Too Many Requests — Daily subscription quota exhausted' })
  async sendPrompt(
    @CurrentUser('userId') userId: string,
    @Body() dto: SendPromptDto,
  ): Promise<SendPromptResponseDto> {
    return this.chatService.sendPrompt(userId, dto);
  }

  @Get('conversations')
  @ApiOperation({
    summary: 'List user conversations',
    description: 'Retrieves all conversation threads for the authenticated user, ordered by most recent activity.',
  })
  @ApiResponse({
    status: 200,
    description: 'Array of conversation summaries with message counts',
    type: [ConversationSummaryDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async listConversations(
    @CurrentUser('userId') userId: string,
  ): Promise<ConversationSummaryDto[]> {
    return this.chatService.listConversations(userId);
  }

  @Get('conversations/:id')
  @ApiOperation({
    summary: 'Get conversation details and messages',
    description: 'Retrieves a full conversation thread including ordered user and assistant messages.',
  })
  @ApiParam({ name: 'id', description: 'Conversation UUID' })
  @ApiResponse({
    status: 200,
    description: 'Full conversation detail with message history',
    type: ConversationDetailDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async getConversation(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ): Promise<ConversationDetailDto> {
    return this.chatService.getConversation(userId, id);
  }

  @Delete('conversations/:id')
  @ApiOperation({
    summary: 'Delete conversation thread',
    description: 'Deletes the conversation and cascades deletion to all contained messages.',
  })
  @ApiParam({ name: 'id', description: 'Conversation UUID' })
  @ApiResponse({ status: 200, description: 'Conversation deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async deleteConversation(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.chatService.deleteConversation(userId, id);
  }

  @Post('stream')
  @ApiOperation({
    summary: 'Stream AI completion (SSE)',
    description: 'Streams the AI response tokens in real-time using Server-Sent Events (SSE).',
  })
  @ApiResponse({ status: 200, description: 'text/event-stream stream of response tokens' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 429, description: 'Quota exhausted' })
  async streamPrompt(
    @CurrentUser('userId') userId: string,
    @Body() dto: SendPromptDto,
    @Res() res: Response,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      const completion = await this.chatService.sendPrompt(userId, dto);
      const words = completion.response.split(' ');

      for (let i = 0; i < words.length; i++) {
        const chunk = words[i] + (i < words.length - 1 ? ' ' : '');
        res.write(`data: ${JSON.stringify({ token: chunk, done: false })}\n\n`);
      }

      res.write(
        `data: ${JSON.stringify({
          done: true,
          conversationId: completion.conversationId,
          tokensUsed: completion.tokensUsed,
        })}\n\n`,
      );
      res.end();
    } catch (err: any) {
      res.write(
        `data: ${JSON.stringify({
          error: err.message || 'Stream generation failed',
          statusCode: err.status || 500,
        })}\n\n`,
      );
      res.end();
    }
  }
}
