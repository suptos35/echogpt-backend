import { ApiProperty } from '@nestjs/swagger';

export class AdminUsersMetricDto {
  @ApiProperty({ example: 45, description: 'Total registered users' })
  total: number;

  @ApiProperty({ example: 42, description: 'Active users' })
  active: number;

  @ApiProperty({ example: 3, description: 'Deactivated users' })
  inactive: number;

  @ApiProperty({ example: 40, description: 'Verified email users' })
  verified: number;
}

export class AdminSubscriptionsMetricDto {
  @ApiProperty({ example: 45, description: 'Total subscriptions' })
  total: number;

  @ApiProperty({ example: 35, description: 'Free tier subscriptions' })
  free: number;

  @ApiProperty({ example: 10, description: 'Premium tier subscriptions' })
  premium: number;

  @ApiProperty({ example: 44, description: 'Active subscriptions' })
  active: number;
}

export class AdminConversationsMetricDto {
  @ApiProperty({ example: 120, description: 'Total conversation threads' })
  total: number;

  @ApiProperty({ example: 850, description: 'Total chat messages exchanged' })
  totalMessages: number;
}

export class AdminSearchesMetricDto {
  @ApiProperty({ example: 340, description: 'Total web searches performed' })
  total: number;

  @ApiProperty({ example: 110, description: 'Cached web searches served' })
  cachedCount: number;
}

export class AdminProvidersMetricDto {
  @ApiProperty({ example: 3, description: 'Total AI providers configured' })
  total: number;

  @ApiProperty({ example: 3, description: 'Active AI providers' })
  active: number;

  @ApiProperty({ example: 'Google Gemini', description: 'System default AI provider' })
  defaultProvider: string | null;
}

export class AdminApiUsageMetricDto {
  @ApiProperty({ example: 2450, description: 'Total API requests recorded' })
  totalRequests: number;

  @ApiProperty({ example: 180, description: 'API requests received today (UTC)' })
  requestsToday: number;

  @ApiProperty({ example: 125, description: 'Average response latency in milliseconds' })
  avgLatencyMs: number;
}

export class AdminDashboardResponseDto {
  @ApiProperty({ type: AdminUsersMetricDto })
  users: AdminUsersMetricDto;

  @ApiProperty({ type: AdminSubscriptionsMetricDto })
  subscriptions: AdminSubscriptionsMetricDto;

  @ApiProperty({ type: AdminConversationsMetricDto })
  conversations: AdminConversationsMetricDto;

  @ApiProperty({ type: AdminSearchesMetricDto })
  searches: AdminSearchesMetricDto;

  @ApiProperty({ type: AdminProvidersMetricDto })
  providers: AdminProvidersMetricDto;

  @ApiProperty({ type: AdminApiUsageMetricDto })
  apiUsage: AdminApiUsageMetricDto;
}
