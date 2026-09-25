import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Auth Flow (e2e)', () => {
  let app: INestApplication;
  const uniqueId = Date.now();
  const testUser = {
    email: `authtest_${uniqueId}@echogpt.app`,
    password: 'Password123!',
    firstName: 'Test',
    lastName: 'E2E',
  };

  let accessToken: string;
  let refreshToken: string;

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
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/auth/register', () => {
    it('should reject registration if password is too short', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: `invalid_${uniqueId}@echogpt.app`,
          password: 'short',
        })
        .expect(400);
    });

    it('should successfully register a new user and return tokens', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user).toMatchObject({
        email: testUser.email.toLowerCase(),
        firstName: testUser.firstName,
        lastName: testUser.lastName,
        role: 'USER',
      });
    });

    it('should reject registration with duplicate email (409 Conflict)', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send(testUser)
        .expect(409);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should reject login with wrong password (401 Unauthorized)', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword!',
        })
        .expect(401);
    });

    it('should login successfully with correct credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      accessToken = response.body.accessToken;
      refreshToken = response.body.refreshToken;
    });
  });

  describe('POST /api/auth/refresh (Rotation)', () => {
    it('should rotate refresh token and return new token pair', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');

      const oldRefreshToken = refreshToken;
      refreshToken = response.body.refreshToken;
      accessToken = response.body.accessToken;

      // Replaying old refresh token should be rejected (401)
      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: oldRefreshToken })
        .expect(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should reject logout without JWT Bearer header', () => {
      return request(app.getHttpServer())
        .post('/api/auth/logout')
        .expect(401);
    });

    it('should successfully log out with valid Bearer token', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken })
        .expect(200);

      // Subsequent refresh with that logged-out token should fail
      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });
  });
});
