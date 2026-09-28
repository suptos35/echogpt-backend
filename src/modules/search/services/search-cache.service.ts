import { Injectable, Logger } from '@nestjs/common';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

@Injectable()
export class SearchCacheService {
  private readonly logger = new Logger(SearchCacheService.name);
  private readonly cache = new Map<string, CacheEntry<any>>();

  // Default TTL: 300 seconds (5 minutes)
  private readonly defaultTtlSeconds = 300;

  /**
   * Retrieve cached value if key exists and has not expired
   */
  get<T = any>(query: string): T | null {
    const key = this.normalizeKey(query);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Store value in cache with specified TTL in seconds
   */
  set<T = any>(
    query: string,
    value: T,
    ttlSeconds: number = this.defaultTtlSeconds,
  ): void {
    const key = this.normalizeKey(query);
    const expiresAt = Date.now() + ttlSeconds * 1000;

    this.cache.set(key, { value, expiresAt });
  }

  /**
   * Check if query is currently cached and valid
   */
  has(query: string): boolean {
    return this.get(query) !== null;
  }

  /**
   * Clear all cached search results
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get count of currently stored cache entries
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Normalize search string to lowercase trimmed representation
   */
  private normalizeKey(query: string): string {
    return query.trim().toLowerCase();
  }
}
