import { Test, TestingModule } from '@nestjs/testing';
import { WebSearchService } from './web-search.service';
import { SearchCacheService } from './services/search-cache.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('WebSearchService (Unit Tests)', () => {
  let service: WebSearchService;
  let prisma: any;
  let cache: SearchCacheService;

  const mockSearchResult = [
    {
      title: 'TypeScript: JavaScript With Syntax For Types',
      url: 'https://www.typescriptlang.org',
      snippet: 'TypeScript extends JavaScript by adding types to the language.',
      source: 'DuckDuckGo Instant Answer',
    },
  ];

  beforeEach(async () => {
    prisma = {
      webSearch: {
        create: jest
          .fn()
          .mockImplementation((args) =>
            Promise.resolve({ id: 'search-1', ...args.data }),
          ),
        findMany: jest.fn(),
      },
    };

    cache = new SearchCacheService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebSearchService,
        { provide: PrismaService, useValue: prisma },
        { provide: SearchCacheService, useValue: cache },
      ],
    }).compile();

    service = module.get<WebSearchService>(WebSearchService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('search', () => {
    it('should perform search, cache results, and mark cached=false on cache miss', async () => {
      const response = await service.search('user-1', {
        query: 'TypeScript documentation',
      });

      expect(response).toBeDefined();
      expect(response.query).toBe('TypeScript documentation');
      expect(response.cached).toBe(false);
      expect(response.results.length).toBeGreaterThan(0);
      expect(prisma.webSearch.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            query: 'TypeScript documentation',
            cached: false,
          }),
        }),
      );

      // Verify cached in memory
      expect(cache.get('TypeScript documentation')).toBeDefined();
    });

    it('should return cached results and mark cached=true on cache hit', async () => {
      cache.set('typescript documentation', mockSearchResult);

      const response = await service.search('user-1', {
        query: 'TypeScript documentation',
      });

      expect(response.cached).toBe(true);
      expect(response.results).toEqual(mockSearchResult);
      expect(prisma.webSearch.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            cached: true,
          }),
        }),
      );
    });
  });

  describe('getHistory', () => {
    it('should return search history for user', async () => {
      prisma.webSearch.findMany.mockResolvedValue([
        {
          id: 'search-1',
          query: 'TypeScript',
          cached: false,
          results: mockSearchResult,
          createdAt: new Date(),
        },
      ]);

      const history = await service.getHistory('user-1');

      expect(history).toHaveLength(1);
      expect(history[0].query).toBe('TypeScript');
      expect(history[0].resultCount).toBe(1);
    });
  });

  describe('getRecentQueries', () => {
    it('should return deduplicated recent queries for user', async () => {
      prisma.webSearch.findMany.mockResolvedValue([
        { query: 'NestJS' },
        { query: 'TypeScript' },
        { query: 'NestJS' }, // Duplicate
        { query: 'PostgreSQL' },
      ]);

      const recent = await service.getRecentQueries('user-1');

      expect(recent.queries).toEqual(['NestJS', 'TypeScript', 'PostgreSQL']);
    });
  });

  describe('getSuggestions', () => {
    it('should return matching query suggestions based on prefix', async () => {
      prisma.webSearch.findMany.mockResolvedValue([
        { query: 'typescript compiler' },
        { query: 'typescript tutorial' },
        { query: 'nest framework' },
      ]);

      const suggestions = await service.getSuggestions('user-1', 'type');

      expect(
        suggestions.suggestions.some((s) => s.includes('typescript')),
      ).toBe(true);
      expect(suggestions.suggestions.some((s) => s.includes('nest'))).toBe(
        false,
      );
    });
  });
});
