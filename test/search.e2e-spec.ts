import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Web Search API & Caching (e2e)', () => {
  let app: INestApplication;
  let userToken: string;

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

    // Register a new test user
    const regRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: `searchtest_${Date.now()}@echogpt.app`,
        password: 'Password123!',
        firstName: 'Search',
        lastName: 'Tester',
      });
    userToken = regRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/search', () => {
    it('should return 401 Unauthorized without Bearer token', () => {
      return request(app.getHttpServer())
        .post('/api/search')
        .send({ query: 'NestJS framework' })
        .expect(401);
    });

    it('should return 400 Bad Request when query is empty', () => {
      return request(app.getHttpServer())
        .post('/api/search')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ query: '' })
        .expect(400);
    });

    it('should perform search and return results with cached=false on first query (Cache MISS)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/search')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ query: 'PostgreSQL 16 release notes' })
        .expect(200);

      expect(res.body).toHaveProperty('query', 'PostgreSQL 16 release notes');
      expect(res.body).toHaveProperty('cached', false);
      expect(res.body).toHaveProperty('totalResults');
      expect(Array.isArray(res.body.results)).toBe(true);
      expect(res.body.results.length).toBeGreaterThan(0);
      expect(res.body.results[0]).toHaveProperty('title');
      expect(res.body.results[0]).toHaveProperty('url');
      expect(res.body.results[0]).toHaveProperty('snippet');
    });

    it('should return cached=true for repeated identical query (Cache HIT)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/search')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ query: 'PostgreSQL 16 release notes' })
        .expect(200);

      expect(res.body.query).toBe('PostgreSQL 16 release notes');
      expect(res.body.cached).toBe(true);
      expect(res.body.results.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/search/history', () => {
    it('should return 401 Unauthorized without Bearer token', () => {
      return request(app.getHttpServer())
        .get('/api/search/history')
        .expect(401);
    });

    it('should return search history list for authenticated user', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/search/history')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0]).toHaveProperty('id');
      expect(res.body[0]).toHaveProperty('query');
      expect(res.body[0]).toHaveProperty('cached');
    });
  });

  describe('GET /api/search/recent', () => {
    it('should return 401 Unauthorized without Bearer token', () => {
      return request(app.getHttpServer()).get('/api/search/recent').expect(401);
    });

    it('should return distinct recent search query strings', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/search/recent')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('queries');
      expect(Array.isArray(res.body.queries)).toBe(true);
      expect(res.body.queries).toContain('PostgreSQL 16 release notes');
    });
  });

  describe('GET /api/search/suggestions', () => {
    it('should return 401 Unauthorized without Bearer token', () => {
      return request(app.getHttpServer())
        .get('/api/search/suggestions?q=postgre')
        .expect(401);
    });

    it('should return suggestions matching search prefix', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/search/suggestions?q=postgre')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('suggestions');
      expect(Array.isArray(res.body.suggestions)).toBe(true);
      expect(
        res.body.suggestions.some((s: string) =>
          s.toLowerCase().includes('postgre'),
        ),
      ).toBe(true);
    });
  });
});
