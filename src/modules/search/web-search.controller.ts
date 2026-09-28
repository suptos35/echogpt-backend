import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { WebSearchService } from './web-search.service';
import { SearchQueryDto } from './dto/search-query.dto';
import { SearchResponseDto } from './dto/search-response.dto';
import {
  SearchHistoryItemDto,
  RecentQueriesDto,
  SearchSuggestionsDto,
} from './dto/search-history.dto';

@ApiTags('Web Search')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('api/search')
export class WebSearchController {
  constructor(private readonly searchService: WebSearchService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Execute web search query',
    description:
      'Searches the web via DuckDuckGo Instant Answer API with in-memory caching to reduce latency.',
  })
  @ApiResponse({
    status: 200,
    description: 'Search results with cache metadata and source links',
    type: SearchResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Query cannot be empty' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async search(
    @CurrentUser('userId') userId: string,
    @Body() dto: SearchQueryDto,
  ): Promise<SearchResponseDto> {
    return this.searchService.search(userId, dto);
  }

  @Get('history')
  @ApiOperation({
    summary: 'Get search history',
    description:
      'Retrieves the current user’s chronological web search history.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of past search queries',
    type: [SearchHistoryItemDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getHistory(
    @CurrentUser('userId') userId: string,
  ): Promise<SearchHistoryItemDto[]> {
    return this.searchService.getHistory(userId);
  }

  @Get('recent')
  @ApiOperation({
    summary: 'Get recent distinct search queries',
    description:
      'Returns the user’s most recent distinct search topics for quick re-execution.',
  })
  @ApiResponse({
    status: 200,
    description: 'Array of recent search query strings',
    type: RecentQueriesDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getRecent(
    @CurrentUser('userId') userId: string,
  ): Promise<RecentQueriesDto> {
    return this.searchService.getRecentQueries(userId);
  }

  @Get('suggestions')
  @ApiOperation({
    summary: 'Get search autocomplete suggestions',
    description:
      'Returns query suggestions based on search query prefix and user history.',
  })
  @ApiQuery({
    name: 'q',
    required: false,
    description: 'Search prefix string for autocomplete suggestions',
    example: 'postgres',
  })
  @ApiResponse({
    status: 200,
    description: 'Autocomplete suggestions matching input prefix',
    type: SearchSuggestionsDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getSuggestions(
    @CurrentUser('userId') userId: string,
    @Query('q') query?: string,
  ): Promise<SearchSuggestionsDto> {
    return this.searchService.getSuggestions(userId, query);
  }
}
