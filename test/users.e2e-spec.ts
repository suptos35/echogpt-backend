import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('User Management & Roles (e2e)', () => {
  let app: INestApplication;
  const uniqueId = Date.now();
  let userToken: string;
  let adminToken: string;

  const testUser = {
    email: `usertest_${uniqueId}@echogpt.app`,
    password: 'InitialPassword123!',
    firstName: 'InitialFirst',
    lastName: 'InitialLast',
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

    // 1. Register test user
    const userRegRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(testUser);
    userToken = userRegRes.body.accessToken;

    // 2. Login as seeded Admin
    const adminLoginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@echogpt.app', password: 'Admin123!' });
    adminToken = adminLoginRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/users/profile', () => {
    it('should return 401 Unauthorized without bearer token', () => {
      return request(app.getHttpServer())
        .get('/api/users/profile')
        .expect(401);
    });

    it('should return current user profile with subscription tier', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body.email).toBe(testUser.email.toLowerCase());
      expect(response.body.firstName).toBe(testUser.firstName);
      expect(response.body.lastName).toBe(testUser.lastName);
      expect(response.body.role).toBe('USER');
      expect(response.body.subscription).toBeDefined();
      expect(response.body.subscription.planType).toBe('FREE');
    });
  });

  describe('PATCH /api/users/profile', () => {
    it('should update user profile first and last name', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ firstName: 'UpdatedName', lastName: 'UpdatedSurname' })
        .expect(200);

      expect(response.body.firstName).toBe('UpdatedName');
      expect(response.body.lastName).toBe('UpdatedSurname');
    });
  });

  describe('RBAC Roles Guard Verification', () => {
    it('should return 403 Forbidden when standard user accesses admin-only route', () => {
      return request(app.getHttpServer())
        .get('/api/users/admin-only-test')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should return 200 OK when administrator accesses admin-only route', () => {
      return request(app.getHttpServer())
        .get('/api/users/admin-only-test')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('PATCH /api/users/change-password', () => {
    it('should reject password change with incorrect current password', () => {
      return request(app.getHttpServer())
        .patch('/api/users/change-password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          currentPassword: 'WrongPassword!',
          newPassword: 'BrandNewPassword123!',
        })
        .expect(401);
    });

    it('should successfully change password with valid current password', async () => {
      await request(app.getHttpServer())
        .patch('/api/users/change-password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          currentPassword: testUser.password,
          newPassword: 'BrandNewPassword123!',
        })
        .expect(200);

      // Verify login succeeds with the NEW password
      const newLoginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'BrandNewPassword123!',
        })
        .expect(200);

      expect(newLoginRes.body).toHaveProperty('accessToken');
      userToken = newLoginRes.body.accessToken;

      // Verify login fails with the OLD password
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(401);
    });
  });

  describe('DELETE /api/users/account', () => {
    it('should deactivate the user account and invalidate session', async () => {
      await request(app.getHttpServer())
        .delete('/api/users/account')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Subsequent authenticated requests with this token should be rejected (401)
      await request(app.getHttpServer())
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(401);

      // Subsequent login attempt should be rejected (401 Account deactivated)
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'BrandNewPassword123!',
        })
        .expect(401);
    });
  });
});
