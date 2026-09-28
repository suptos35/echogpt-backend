import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Chat API & Model Orchestration (e2e)', () => {
  let app: INestApplication;
  let userToken: string;
  let conversationId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();

    // Register a new test user (starts with 20 free requests)
    const regRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: `chattest_${Date.now()}@echogpt.app`,
        password: 'Password123!',
        firstName: 'Chat',
        lastName: 'User',
      });
    userToken = regRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/chat/send-prompt', () => {
    it('should return 401 Unauthorized without Bearer token', () => {
      return request(app.getHttpServer())
        .post('/api/chat/send-prompt')
        .send({ prompt: 'Hello AI' })
        .expect(401);
    });

    it('should return 400 Bad Request if prompt is empty', () => {
      return request(app.getHttpServer())
        .post('/api/chat/send-prompt')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ prompt: '' })
        .expect(400);
    });

    it('should process prompt, create conversation, decrement quota, and return completion', async () => {
      // 1. Check initial remaining requests (20)
      const subResBefore = await request(app.getHttpServer())
        .get('/api/subscription/remaining-requests')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      const initialRemaining = subResBefore.body.remainingRequests;

      // 2. Send prompt
      const res = await request(app.getHttpServer())
        .post('/api/chat/send-prompt')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ prompt: 'What is the capital of France?' })
        .expect(200);

      expect(res.body).toHaveProperty('conversationId');
      expect(res.body).toHaveProperty('messageId');
      expect(res.body).toHaveProperty('response');
      expect(res.body).toHaveProperty('modelUsed');
      expect(res.body).toHaveProperty('provider');
      expect(res.body).toHaveProperty('tokensUsed');
      expect(res.body.tokensUsed).toHaveProperty('total');

      conversationId = res.body.conversationId;

      // 3. Verify quota decremented by exactly 1
      const subResAfter = await request(app.getHttpServer())
        .get('/api/subscription/remaining-requests')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      expect(subResAfter.body.remainingRequests).toBe(initialRemaining - 1);
    });

    it('should append follow-up prompt to existing conversation when conversationId provided', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/chat/send-prompt')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          prompt: 'What is its population?',
          conversationId,
        })
        .expect(200);

      expect(res.body.conversationId).toBe(conversationId);
      expect(res.body).toHaveProperty('response');
    });
  });

  describe('GET /api/chat/conversations', () => {
    it('should return 401 Unauthorized without Bearer token', () => {
      return request(app.getHttpServer())
        .get('/api/chat/conversations')
        .expect(401);
    });

    it('should return array of user conversations', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/chat/conversations')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      const found = res.body.find((c: any) => c.id === conversationId);
      expect(found).toBeDefined();
    });
  });

  describe('GET /api/chat/conversations/:id', () => {
    it('should return conversation with complete ordered message history', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/chat/conversations/${conversationId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.id).toBe(conversationId);
      expect(Array.isArray(res.body.messages)).toBe(true);
      // We sent 2 prompts -> 4 messages (2 USER, 2 ASSISTANT)
      expect(res.body.messages.length).toBe(4);
      expect(res.body.messages[0].role).toBe('USER');
      expect(res.body.messages[1].role).toBe('ASSISTANT');
    });

    it('should return 404 for non-existent conversation id', () => {
      return request(app.getHttpServer())
        .get('/api/chat/conversations/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });
  });

  describe('DELETE /api/chat/conversations/:id', () => {
    it('should delete conversation and return success', async () => {
      await request(app.getHttpServer())
        .delete(`/api/chat/conversations/${conversationId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Verify conversation no longer exists
      await request(app.getHttpServer())
        .get(`/api/chat/conversations/${conversationId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });
  });
});
