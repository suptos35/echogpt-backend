import { SearchCacheService } from './search-cache.service';

describe('SearchCacheService (Unit Tests)', () => {
  let cache: SearchCacheService;

  beforeEach(() => {
    cache = new SearchCacheService();
  });

  it('should be defined', () => {
    expect(cache).toBeDefined();
  });

  it('should set and get a value by normalized query key', () => {
    const data = [
      {
        title: 'NestJS Docs',
        url: 'https://nestjs.com',
        snippet: 'Framework',
        source: 'DuckDuckGo',
      },
    ];
    cache.set('nestjs documentation', data);

    const retrieved = cache.get('  NestJS Documentation  '); // Normalized case & trim
    expect(retrieved).toEqual(data);
  });

  it('should return null for cache miss', () => {
    expect(cache.get('non-existent-query')).toBeNull();
  });

  it('should respect TTL and expire items', () => {
    jest.useFakeTimers();
    const data = [
      {
        title: 'Expiring Test',
        url: 'https://test.com',
        snippet: 'Expiring',
        source: 'DuckDuckGo',
      },
    ];
    cache.set('expiring query', data, 10); // 10 seconds TTL

    expect(cache.get('expiring query')).toEqual(data);

    // Fast-forward 11 seconds
    jest.advanceTimersByTime(11000);

    expect(cache.get('expiring query')).toBeNull();
    jest.useRealTimers();
  });

  it('should clear cache on clear()', () => {
    cache.set('key1', [{ title: '1', url: '', snippet: '', source: '' }]);
    cache.set('key2', [{ title: '2', url: '', snippet: '', source: '' }]);
    expect(cache.size).toBe(2);

    cache.clear();
    expect(cache.size).toBe(0);
    expect(cache.get('key1')).toBeNull();
  });
});
