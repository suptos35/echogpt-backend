import { ApiProperty } from '@nestjs/swagger';

export class SearchHistoryItemDto {
  @ApiProperty({ example: 'search-uuid-1' })
  id: string;

  @ApiProperty({ example: 'PostgreSQL 16 release notes' })
  query: string;

  @ApiProperty({ example: false })
  cached: boolean;

  @ApiProperty({ example: 3 })
  resultCount: number;

  @ApiProperty({ example: '2026-09-29T12:00:00.000Z' })
  createdAt: Date;
}

export class RecentQueriesDto {
  @ApiProperty({
    example: ['PostgreSQL 16', 'NestJS cache', 'TypeScript 5.5'],
    type: [String],
  })
  queries: string[];
}

export class SearchSuggestionsDto {
  @ApiProperty({
    example: ['postgresql 16 release notes', 'postgresql docker container'],
    type: [String],
  })
  suggestions: string[];
}
