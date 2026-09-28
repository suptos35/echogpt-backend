import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { RoleName } from '@prisma/client';

describe('Admin Panel APIs (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let adminUserId: string;
  let userToken: string;
  let testUserId: string;
  let testUserEmail: string;

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

    // 1. Authenticate seeded Admin
    const adminLoginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@echogpt.app', password: 'Admin123!' });
    adminToken = adminLoginRes.body.accessToken;
    adminUserId = adminLoginRes.body.user.id;

    // 2. Register and authenticate standard test user
    testUserEmail = `admintest_${Date.now()}@echogpt.app`;
    const userRegRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: testUserEmail,
        password: 'Password123!',
        firstName: 'AdminTest',
        lastName: 'Subject',
      });
    userToken = userRegRes.body.accessToken;
    testUserId = userRegRes.body.user.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Authentication & Authorization Guards', () => {
    const adminEndpoints = [
      { method: 'get', url: '/api/admin/dashboard' },
      { method: 'get', url: '/api/admin/users' },
      { method: 'patch', url: '/api/admin/users/dummy-id/status' },
      { method: 'get', url: '/api/admin/subscriptions' },
      { method: 'get', url: '/api/admin/logs' },
      { method: 'get', url: '/api/admin/health' },
    ];

    it.each(adminEndpoints)(
      'should reject unauthenticated request with 401 for $method $url',
      async ({ method, url }) => {
        const req = (request(app.getHttpServer()) as any)[method](url);
        if (method === 'patch') {
          req.send({ isActive: false });
        }
        await req.expect(401);
      },
    );

    it.each(adminEndpoints)(
      'should reject standard user request with 403 Forbidden for $method $url',
      async ({ method, url }) => {
        const req = (request(app.getHttpServer()) as any)
          [method](url)
          .set('Authorization', `Bearer ${userToken}`);
        if (method === 'patch') {
          req.send({ isActive: false });
        }
        await req.expect(403);
      },
    );
  });

  describe('GET /api/admin/dashboard', () => {
    it('should return aggregated system metrics for admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('users');
      expect(res.body.users).toHaveProperty('total');
      expect(res.body.users.total).toBeGreaterThanOrEqual(2);
      expect(res.body.users).toHaveProperty('active');

      expect(res.body).toHaveProperty('subscriptions');
      expect(res.body.subscriptions).toHaveProperty('total');
      expect(res.body.subscriptions).toHaveProperty('free');
      expect(res.body.subscriptions).toHaveProperty('premium');

      expect(res.body).toHaveProperty('conversations');
      expect(res.body.conversations).toHaveProperty('total');
      expect(res.body.conversations).toHaveProperty('totalMessages');

      expect(res.body).toHaveProperty('searches');
      expect(res.body.searches).toHaveProperty('total');

      expect(res.body).toHaveProperty('providers');
      expect(res.body.providers).toHaveProperty('total');
      expect(res.body.providers.total).toBeGreaterThanOrEqual(1);

      expect(res.body).toHaveProperty('apiUsage');
      expect(res.body.apiUsage).toHaveProperty('totalRequests');
      expect(res.body.apiUsage).toHaveProperty('requestsToday');
      expect(res.body.apiUsage).toHaveProperty('avgLatencyMs');
    });
  });

  describe('GET /api/admin/users', () => {
    it('should return paginated list of all registered users', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/users?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body.users)).toBe(true);
      expect(res.body.users.length).toBeGreaterThanOrEqual(2);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(10);
      expect(res.body.pagination.total).toBeGreaterThanOrEqual(2);

      // Verify user items omit password hashes and include subscriptions
      const testUserItem = res.body.users.find(
        (u: any) => u.email === testUserEmail,
      );
      expect(testUserItem).toBeDefined();
      expect(testUserItem).not.toHaveProperty('passwordHash');
      expect(testUserItem).toHaveProperty('role', RoleName.USER);
      expect(testUserItem).toHaveProperty('subscription');
    });

    it('should filter users by role', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/users?role=ADMIN')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body.users)).toBe(true);
      expect(res.body.users.length).toBeGreaterThanOrEqual(1);
      const adminItem = res.body.users.find(
        (u: any) => u.email === 'admin@echogpt.app',
      );
      expect(adminItem).toBeDefined();
      expect(adminItem).not.toHaveProperty('passwordHash');
      for (const u of res.body.users) {
        expect(u.role).toBe(RoleName.ADMIN);
      }
    });

    it('should filter users by search query', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/admin/users?search=${encodeURIComponent(testUserEmail)}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.users).toHaveLength(1);
      expect(res.body.users[0].email).toBe(testUserEmail);
    });
  });

  describe('PATCH /api/admin/users/:id/status', () => {
    it('should prevent an admin from deactivating their own account', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/admin/users/${adminUserId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false })
        .expect(400);

      expect(res.body.message).toContain(
        'Cannot deactivate your own administrator account',
      );
    });

    it('should return 404 if target user does not exist', async () => {
      await request(app.getHttpServer())
        .patch('/api/admin/users/00000000-0000-0000-0000-000000000000/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false })
        .expect(404);
    });

    it('should deactivate a user account and invalidate their login sessions', async () => {
      // 1. Deactivate test user
      const deactivateRes = await request(app.getHttpServer())
        .patch(`/api/admin/users/${testUserId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false })
        .expect(200);

      expect(deactivateRes.body.isActive).toBe(false);

      // 2. Verify deactivated user cannot log in
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: testUserEmail, password: 'Password123!' })
        .expect(401);

      // 3. Reactivate user account
      const reactivateRes = await request(app.getHttpServer())
        .patch(`/api/admin/users/${testUserId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: true })
        .expect(200);

      expect(reactivateRes.body.isActive).toBe(true);

      // 4. Verify user can log in again
      const loginAgainRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: testUserEmail, password: 'Password123!' })
        .expect(200);

      expect(loginAgainRes.body).toHaveProperty('accessToken');
    });
  });

  describe('GET /api/admin/subscriptions', () => {
    it('should return subscription breakdown and recent subscriptions', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/subscriptions')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('summary');
      expect(res.body.summary).toHaveProperty('total');
      expect(res.body.summary).toHaveProperty('free');
      expect(res.body.summary).toHaveProperty('premium');
      expect(res.body.summary).toHaveProperty('active');

      expect(Array.isArray(res.body.subscriptions)).toBe(true);
      expect(res.body.subscriptions.length).toBeGreaterThanOrEqual(1);

      const sub = res.body.subscriptions[0];
      expect(sub).toHaveProperty('id');
      expect(sub).toHaveProperty('userEmail');
      expect(sub).toHaveProperty('planType');
      expect(sub).toHaveProperty('maxRequestsPerDay');
      expect(sub).toHaveProperty('usedRequestsToday');
    });
  });

  describe('GET /api/admin/logs', () => {
    it('should return paginated system API usage logs', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/logs?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('logs');
      expect(Array.isArray(res.body.logs)).toBe(true);
      expect(res.body).toHaveProperty('pagination');
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(10);
    });
  });

  describe('GET /api/admin/health', () => {
    it('should return comprehensive system diagnostics including database and process stats', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/health')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('status', 'healthy');
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body).toHaveProperty('uptime');
      expect(typeof res.body.uptime).toBe('number');

      expect(res.body).toHaveProperty('database');
      expect(res.body.database).toHaveProperty('status', 'connected');
      expect(typeof res.body.database.latencyMs).toBe('number');

      expect(res.body).toHaveProperty('memory');
      expect(typeof res.body.memory.heapUsedMb).toBe('number');

      expect(res.body).toHaveProperty('process');
      expect(res.body.process).toHaveProperty('nodeVersion');
      expect(res.body.process).toHaveProperty('platform');
    });
  });
});
