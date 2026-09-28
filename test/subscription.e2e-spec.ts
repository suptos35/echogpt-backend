import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Subscription Management (e2e)', () => {
  let app: INestApplication;
  const uniqueId = Date.now();
  let userToken: string;

  const testUser = {
    email: `subtest_${uniqueId}@echogpt.app`,
    password: 'Password123!',
    firstName: 'Sub',
    lastName: 'Tester',
  };

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

    // Register a new test user (automatically gets FREE subscription with 20 requests)
    const regRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(testUser);
    userToken = regRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/subscription/status', () => {
    it('should return 401 Unauthorized without Bearer token', () => {
      return request(app.getHttpServer())
        .get('/api/subscription/status')
        .expect(401);
    });

    it('should return initial FREE subscription status with 20 daily requests', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/subscription/status')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('planType', 'FREE');
      expect(res.body).toHaveProperty('status', 'ACTIVE');
      expect(res.body).toHaveProperty('maxRequestsPerDay', 20);
      expect(res.body).toHaveProperty('usedRequestsToday', 0);
      expect(res.body).toHaveProperty('remainingRequests', 20);
    });
  });

  describe('GET /api/subscription/remaining-requests', () => {
    it('should return 401 Unauthorized without Bearer token', () => {
      return request(app.getHttpServer())
        .get('/api/subscription/remaining-requests')
        .expect(401);
    });

    it('should return remaining requests count', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/subscription/remaining-requests')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('remainingRequests', 20);
    });
  });

  describe('POST /api/subscription/upgrade', () => {
    it('should return 401 Unauthorized without Bearer token', () => {
      return request(app.getHttpServer())
        .post('/api/subscription/upgrade')
        .expect(401);
    });

    it('should successfully upgrade user subscription to PREMIUM with 500 daily requests', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/subscription/upgrade')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('planType', 'PREMIUM');
      expect(res.body).toHaveProperty('maxRequestsPerDay', 500);
      expect(res.body).toHaveProperty('status', 'ACTIVE');
      expect(res.body).toHaveProperty('remainingRequests', 500);
    });

    it('should reflect PREMIUM tier in status endpoint', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/subscription/status')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.planType).toBe('PREMIUM');
      expect(res.body.maxRequestsPerDay).toBe(500);
    });
  });

  describe('POST /api/subscription/downgrade', () => {
    it('should return 401 Unauthorized without Bearer token', () => {
      return request(app.getHttpServer())
        .post('/api/subscription/downgrade')
        .expect(401);
    });

    it('should successfully downgrade user subscription back to FREE with 20 daily requests', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/subscription/downgrade')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('planType', 'FREE');
      expect(res.body).toHaveProperty('maxRequestsPerDay', 20);
      expect(res.body).toHaveProperty('status', 'ACTIVE');
    });

    it('should reflect FREE tier in status endpoint after downgrade', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/subscription/status')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.planType).toBe('FREE');
      expect(res.body.maxRequestsPerDay).toBe(20);
    });
  });
});
