import { Test, TestingModule } from '@nestjs/testing';
import { WebSearchController } from './web-search.controller';
import { WebSearchService } from './web-search.service';

describe('WebSearchController', () => {
  let controller: WebSearchController;
  let searchService: any;

  const mockSearchResponse = {
    query: 'NestJS documentation',
    provider: 'DuckDuckGo Instant Answer',
    cached: false,
    results: [],
  };

  const mockSearchService = {
    search: jest.fn(),
    getHistory: jest.fn(),
    getRecentQueries: jest.fn(),
    getSuggestions: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebSearchController],
      providers: [
        {
          provide: WebSearchService,
          useValue: mockSearchService,
        },
      ],
    }).compile();

    controller = module.get<WebSearchController>(WebSearchController);
    searchService = module.get(WebSearchService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('search', () => {
    it('should execute web search and return results', async () => {
      mockSearchService.search.mockResolvedValue(mockSearchResponse);

      const dto = { query: 'NestJS documentation' };
      const result = await controller.search('user-1', dto);

      expect(result).toEqual(mockSearchResponse);
      expect(searchService.search).toHaveBeenCalledWith('user-1', dto);
    });
  });

  describe('getHistory', () => {
    it('should return user search history', async () => {
      mockSearchService.getHistory.mockResolvedValue([
        {
          id: 'search-1',
          query: 'NestJS documentation',
          cached: false,
          createdAt: new Date(),
        },
      ]);

      const result = await controller.getHistory('user-1');

      expect(result).toHaveLength(1);
      expect(searchService.getHistory).toHaveBeenCalledWith('user-1');
    });
  });

  describe('getRecent', () => {
    it('should return recent search queries', async () => {
      mockSearchService.getRecentQueries.mockResolvedValue({
        queries: ['NestJS documentation'],
      });

      const result = await controller.getRecent('user-1');

      expect(result.queries).toContain('NestJS documentation');
      expect(searchService.getRecentQueries).toHaveBeenCalledWith('user-1');
    });
  });

  describe('getSuggestions', () => {
    it('should return autocomplete suggestions', async () => {
      mockSearchService.getSuggestions.mockResolvedValue({
        prefix: 'nest',
        suggestions: ['nestjs', 'nestjs documentation'],
      });

      const result = await controller.getSuggestions('user-1', 'nest');

      expect(result.suggestions).toContain('nestjs');
      expect(searchService.getSuggestions).toHaveBeenCalledWith(
        'user-1',
        'nest',
      );
    });
  });
});
