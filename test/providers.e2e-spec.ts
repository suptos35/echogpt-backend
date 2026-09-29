import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { ProviderType } from '@prisma/client';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('AI Provider Management (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let userToken: string;
  let adminToken: string;
  let geminiProviderId: string;
  let openaiProviderId: string;

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
    prisma = app.get<PrismaService>(PrismaService);

    // 1. Login as seeded Admin
    const adminLoginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@echogpt.app', password: 'Admin123!' });
    adminToken = adminLoginRes.body.accessToken;

    // 2. Register / login standard User
    const regRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: `provtest_${Date.now()}@echogpt.app`,
        password: 'Password123!',
        firstName: 'Prov',
        lastName: 'Tester',
      });
    userToken = regRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/providers', () => {
    it('should return 401 Unauthorized without Bearer token', () => {
      return request(app.getHttpServer()).get('/api/providers').expect(401);
    });

    it('should return list of providers for authenticated user without leaking raw or encrypted keys', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/providers')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);

      // Verify no key leakage
      for (const provider of res.body) {
        expect(provider).not.toHaveProperty('encryptedApiKey');
        expect(provider).not.toHaveProperty('apiKey');
        expect(provider).toHaveProperty('hasApiKey');
        expect(provider).toHaveProperty('name');
        expect(provider).toHaveProperty('defaultModel');

        if (provider.name === ProviderType.GEMINI) {
          geminiProviderId = provider.id;
        } else if (provider.name === ProviderType.OPENAI) {
          openaiProviderId = provider.id;
        }
      }
    });
  });

  describe('GET /api/providers/:id', () => {
    it('should return 401 Unauthorized without Bearer token', () => {
      return request(app.getHttpServer())
        .get(`/api/providers/${geminiProviderId}`)
        .expect(401);
    });

    it('should return single provider detail without leaking secret keys', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/providers/${geminiProviderId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.id).toBe(geminiProviderId);
      expect(res.body).not.toHaveProperty('encryptedApiKey');
      expect(res.body).not.toHaveProperty('apiKey');
      expect(res.body).toHaveProperty('hasApiKey');
    });

    it('should return 404 for non-existent provider id', () => {
      return request(app.getHttpServer())
        .get('/api/providers/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });
  });

  describe('Admin Guard Verification for Provider Mutation Endpoints', () => {
    it('POST /api/providers should return 403 Forbidden for standard user', () => {
      return request(app.getHttpServer())
        .post('/api/providers')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: ProviderType.CLAUDE,
          displayName: 'Anthropic Claude',
          defaultModel: 'claude-3-5-sonnet',
          availableModels: ['claude-3-5-sonnet'],
        })
        .expect(403);
    });

    it('PATCH /api/providers/:id should return 403 Forbidden for standard user', () => {
      return request(app.getHttpServer())
        .patch(`/api/providers/${geminiProviderId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ defaultModel: 'gemini-2.0-flash' })
        .expect(403);
    });

    it('POST /api/providers/:id/set-default should return 403 Forbidden for standard user', () => {
      return request(app.getHttpServer())
        .post(`/api/providers/${geminiProviderId}/set-default`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('Admin Operations & Key Encryption Verification', () => {
    it('PATCH /api/providers/:id should update provider and encrypt API key successfully', async () => {
      const plaintextKey = 'AIzaSyDemo-gemini-test-key-12345';
      const res = await request(app.getHttpServer())
        .patch(`/api/providers/${geminiProviderId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          apiKey: plaintextKey,
          defaultModel: 'gemini-1.5-flash',
        })
        .expect(200);

      expect(res.body.id).toBe(geminiProviderId);
      expect(res.body.hasApiKey).toBe(true);
      expect(res.body).not.toHaveProperty('encryptedApiKey');
      expect(res.body).not.toHaveProperty('apiKey');

      // Verify DB contains genuine ciphertext with IV and not the plaintext key
      const dbRecord = await prisma.aiProvider.findUnique({
        where: { id: geminiProviderId },
      });
      expect(dbRecord).toBeDefined();
      expect(dbRecord?.encryptedApiKey).not.toBe(plaintextKey);
      expect(dbRecord?.encryptedApiKey).toMatch(
        /^[0-9a-fA-F]{32}:[0-9a-fA-F]+$/,
      );
    });

    it('POST /api/providers/:id/set-default should switch default provider', async () => {
      if (!openaiProviderId) {
        // Fallback: find openai id
        const listRes = await request(app.getHttpServer())
          .get('/api/providers')
          .set('Authorization', `Bearer ${adminToken}`);
        const openai = listRes.body.find(
          (p: any) => p.name === ProviderType.OPENAI,
        );
        openaiProviderId = openai.id;
      }

      const res = await request(app.getHttpServer())
        .post(`/api/providers/${openaiProviderId}/set-default`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.id).toBe(openaiProviderId);
      expect(res.body.isDefault).toBe(true);

      // Verify Gemini is no longer default
      const geminiRes = await request(app.getHttpServer())
        .get(`/api/providers/${geminiProviderId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(geminiRes.body.isDefault).toBe(false);

      // Restore Gemini as default
      await request(app.getHttpServer())
        .post(`/api/providers/${geminiProviderId}/set-default`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('DELETE /api/providers/:id', () => {
    let deletableProviderId: string;

    beforeAll(async () => {
      // Create a temporary provider for deletion testing if not present
      const createRes = await request(app.getHttpServer())
        .post('/api/providers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: ProviderType.CLAUDE,
          displayName: 'Anthropic Claude Temp',
          defaultModel: 'claude-3-5-sonnet',
          availableModels: ['claude-3-5-sonnet'],
          isEnabled: false,
          isDefault: false,
        });

      if (createRes.status === 201) {
        deletableProviderId = createRes.body.id;
      } else {
        // Find existing Claude provider
        const listRes = await request(app.getHttpServer())
          .get('/api/providers')
          .set('Authorization', `Bearer ${adminToken}`);
        const claude = listRes.body.find(
          (p: any) => p.name === ProviderType.CLAUDE,
        );
        deletableProviderId = claude?.id;
      }
    });

    it('should return 401 Unauthorized without token', () => {
      return request(app.getHttpServer())
        .delete(`/api/providers/${deletableProviderId}`)
        .expect(401);
    });

    it('should return 403 Forbidden for non-admin user', () => {
      return request(app.getHttpServer())
        .delete(`/api/providers/${deletableProviderId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should return 400 Bad Request when attempting to delete the default provider', () => {
      return request(app.getHttpServer())
        .delete(`/api/providers/${geminiProviderId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('should return 404 Not Found for non-existent provider UUID', () => {
      return request(app.getHttpServer())
        .delete('/api/providers/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should successfully delete non-default provider as Admin', async () => {
      if (!deletableProviderId) return;

      const res = await request(app.getHttpServer())
        .delete(`/api/providers/${deletableProviderId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.id).toBe(deletableProviderId);

      // Confirm removed from database
      const dbCheck = await prisma.aiProvider.findUnique({
        where: { id: deletableProviderId },
      });
      expect(dbCheck).toBeNull();
    });
  });

  describe('GET /api/providers/:id/health', () => {
    it('should return health status for valid provider', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/providers/${geminiProviderId}/health`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('status');
      expect(res.body).toHaveProperty('provider', ProviderType.GEMINI);
      expect(res.body).toHaveProperty('latencyMs');
      expect(res.body).toHaveProperty('timestamp');
    });

    it('should return graceful unhealthy status (200 OK, not 500) for provider with invalid key', async () => {
      // Temporarily set an invalid key on OpenAI provider
      if (openaiProviderId) {
        await request(app.getHttpServer())
          .patch(`/api/providers/${openaiProviderId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ apiKey: 'invalid-test-key-deliberate-failure' })
          .expect(200);

        const res = await request(app.getHttpServer())
          .get(`/api/providers/${openaiProviderId}/health`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(res.body.status).toBe('unhealthy');
        expect(res.body.message).toContain('invalid');
      }
    });
  });
});
