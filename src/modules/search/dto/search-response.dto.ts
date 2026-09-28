import { ApiProperty } from '@nestjs/swagger';

export class SearchResultItemDto {
  @ApiProperty({ example: 'PostgreSQL: Documentation: 16: Release Notes' })
  title: string;

  @ApiProperty({ example: 'https://www.postgresql.org/docs/16/release-16.html' })
  url: string;

  @ApiProperty({
    example: 'PostgreSQL 16 includes improvements to query parallelism, SIMD CPU acceleration, and bidirectional logical replication...',
  })
  snippet: string;

  @ApiProperty({ example: 'DuckDuckGo Instant Answer' })
  source: string;
}

export class SearchResponseDto {
  @ApiProperty({ example: 'PostgreSQL 16 release notes' })
  query: string;

  @ApiProperty({
    description: 'Whether the response was served directly from in-memory cache',
    example: false,
  })
  cached: boolean;

  @ApiProperty({ example: 3 })
  totalResults: number;

  @ApiProperty({ type: [SearchResultItemDto] })
  results: SearchResultItemDto[];

  @ApiProperty({ example: '2026-09-29T12:00:00.000Z' })
  searchedAt: Date;
}
