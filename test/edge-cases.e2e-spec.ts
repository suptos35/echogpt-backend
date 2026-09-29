import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { PlanType } from '@prisma/client';

describe('Edge Cases & Robustness (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

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
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Security Edge Case: Stateless Access Token Lifecycle & Password Change', () => {
    it('should keep old access token valid (15m window) while immediately revoking refresh token on password change', async () => {
      const email = `pwd_edge_${Date.now()}@echogpt.app`;
      const regRes = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email,
          password: 'OldPassword123!',
          firstName: 'Edge',
          lastName: 'Tester',
        })
        .expect(201);

      const oldAccessToken = regRes.body.accessToken;
      const oldRefreshToken = regRes.body.refreshToken;

      // 1. Change password using oldAccessToken
      await request(app.getHttpServer())
        .patch('/api/users/change-password')
        .set('Authorization', `Bearer ${oldAccessToken}`)
        .send({
          currentPassword: 'OldPassword123!',
          newPassword: 'NewPassword123!',
        })
        .expect(200);

      // 2. Old access token still works because JWT access tokens are stateless
      const profileRes = await request(app.getHttpServer())
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${oldAccessToken}`)
        .expect(200);
      expect(profileRes.body.email).toBe(email);

      // 3. Old refresh token is immediately revoked in database
      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: oldRefreshToken })
        .expect(401);
    });
  });

  describe('Business Logic Edge Case: Subscription Downgrade with usedRequestsToday > 20', () => {
    it('should not allow remaining requests to go negative and should block requests with 429', async () => {
      const email = `sub_edge_${Date.now()}@echogpt.app`;
      const regRes = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email,
          password: 'Password123!',
          firstName: 'Sub',
          lastName: 'Edge',
        })
        .expect(201);

      const token = regRes.body.accessToken;
      const userId = regRes.body.user.id;

      // 1. Upgrade to PREMIUM
      await request(app.getHttpServer())
        .post('/api/subscription/upgrade')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // 2. Directly set usedRequestsToday = 50 in DB to simulate high usage
      await prisma.subscription.update({
        where: { userId },
        data: { usedRequestsToday: 50 },
      });

      // 3. Downgrade to FREE (quota max = 20)
      const downgradeRes = await request(app.getHttpServer())
        .post('/api/subscription/downgrade')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(downgradeRes.body.planType).toBe(PlanType.FREE);
      expect(downgradeRes.body.usedRequestsToday).toBe(50);
      expect(downgradeRes.body.remainingRequests).toBe(0); // Math.max(0, 20 - 50) => 0

      // 4. Checking remaining balance returns 0, not negative
      const balanceRes = await request(app.getHttpServer())
        .get('/api/subscription/remaining-requests')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(balanceRes.body.remainingRequests).toBe(0);

      // 5. Attempting to consume quota (send prompt) fails with clean 429 Too Many Requests
      const chatRes = await request(app.getHttpServer())
        .post('/api/chat/send-prompt')
        .set('Authorization', `Bearer ${token}`)
        .send({ prompt: 'This should be blocked by exhausted quota' })
        .expect(429);

      expect(chatRes.body.message).toContain('quota exhausted');
    });
  });

  describe('Business Logic Edge Case: UTC Midnight Boundary Quota Reset', () => {
    it('should reset usedRequestsToday to 0 when lastResetDate is from previous UTC day', async () => {
      const email = `utc_edge_${Date.now()}@echogpt.app`;
      const regRes = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email,
          password: 'Password123!',
          firstName: 'Utc',
          lastName: 'Reset',
        })
        .expect(201);

      const token = regRes.body.accessToken;
      const userId = regRes.body.user.id;

      // Set lastResetDate to yesterday 23:59:59 UTC with used quota = 20
      const yesterday = new Date();
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      yesterday.setUTCHours(23, 59, 59, 0);

      await prisma.subscription.update({
        where: { userId },
        data: {
          lastResetDate: yesterday,
          usedRequestsToday: 20,
        },
      });

      // Querying status triggers the UTC calendar day boundary check
      const statusRes = await request(app.getHttpServer())
        .get('/api/subscription/status')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(statusRes.body.usedRequestsToday).toBe(0);
      expect(statusRes.body.remainingRequests).toBe(20);
    });
  });

  describe('Concurrency Edge Case: Concurrent Refresh-Token Requests', () => {
    it('should handle simultaneous refresh requests cleanly without race condition crashes', async () => {
      const email = `race_refresh_${Date.now()}@echogpt.app`;
      const regRes = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email,
          password: 'Password123!',
          firstName: 'Race',
          lastName: 'Refresh',
        })
        .expect(201);

      const refreshToken = regRes.body.refreshToken;

      // Fire two refresh requests simultaneously with the same token
      const [res1, res2] = await Promise.all([
        request(app.getHttpServer())
          .post('/api/auth/refresh')
          .send({ refreshToken }),
        request(app.getHttpServer())
          .post('/api/auth/refresh')
          .send({ refreshToken }),
      ]);

      const statuses = [res1.status, res2.status].sort();
      // Exactly one must succeed (200), and the other must be rejected (401)
      expect(statuses).toEqual([200, 401]);
      // Neither should ever crash with 500
      expect(res1.status).not.toBe(500);
      expect(res2.status).not.toBe(500);
    });
  });

  describe('Registration Edge Case: Duplicate Email Registration', () => {
    it('should return clean 409 Conflict when registering with an existing email', async () => {
      const email = `duplicate_${Date.now()}@echogpt.app`;

      // First registration succeeds
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email,
          password: 'Password123!',
          firstName: 'First',
          lastName: 'User',
        })
        .expect(201);

      // Second registration with same email returns clean 409
      const dupRes = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email,
          password: 'Password456!',
          firstName: 'Second',
          lastName: 'User',
        })
        .expect(409);

      expect(dupRes.body.error).toBe('Conflict');
      expect(dupRes.body.message).toContain('already exists');
    });
  });

  describe('Provider Robustness Edge Case: Disabled Default Provider Behavior', () => {
    it('should fall back or return clear error when default provider is disabled', async () => {
      // Find the default provider
      const defaultProvider = await prisma.aiProvider.findFirst({
        where: { isDefault: true },
      });
      expect(defaultProvider).toBeDefined();

      if (!defaultProvider) return;

      // Temporarily disable the default provider
      await prisma.aiProvider.update({
        where: { id: defaultProvider.id },
        data: { isEnabled: false },
      });

      const userRes = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: `disabled_prov_${Date.now()}@echogpt.app`,
          password: 'Password123!',
          firstName: 'Disabled',
          lastName: 'Prov',
        });
      const token = userRes.body.accessToken;

      // Chat request should gracefully fall back to another enabled provider or return clear error
      const chatRes = await request(app.getHttpServer())
        .post('/api/chat/send-prompt')
        .set('Authorization', `Bearer ${token}`)
        .send({ prompt: 'Hello when default is disabled' });

      // Should never crash with 500
      expect(chatRes.status).not.toBe(500);
      expect([200, 201, 400, 404]).toContain(chatRes.status);

      // Restore default provider
      await prisma.aiProvider.update({
        where: { id: defaultProvider.id },
        data: { isEnabled: true },
      });
    });
  });
});
