import {
  Controller,
  Get,
  Patch,
  Param,
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
  ApiParam,
} from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AdminService } from './admin.service';
import { AdminDashboardResponseDto } from './dto/admin-dashboard.dto';
import { AdminUsersQueryDto } from './dto/admin-users-query.dto';
import { AdminUsersListResponseDto } from './dto/admin-user-item.dto';
import {
  UpdateUserStatusDto,
  AdminUserStatusResponseDto,
} from './dto/update-user-status.dto';
import { AdminSubscriptionsResponseDto } from './dto/admin-subscriptions.dto';
import { AdminLogsQueryDto } from './dto/admin-logs-query.dto';
import { AdminLogsResponseDto } from './dto/admin-logs-response.dto';
import { AdminSystemHealthDto } from './dto/admin-system-health.dto';

@ApiTags('Admin Panel')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.ADMIN)
@Controller('api/admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @ApiOperation({
    summary: 'System-wide dashboard statistics',
    description:
      'Retrieves aggregated counts and metrics across users, subscriptions, conversations, web searches, providers, and API requests. Restricted to administrators.',
  })
  @ApiResponse({
    status: 200,
    description: 'Aggregated dashboard statistics',
    type: AdminDashboardResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires ADMIN role' })
  async getDashboard(): Promise<AdminDashboardResponseDto> {
    return this.adminService.getDashboardStats();
  }

  @Get('users')
  @ApiOperation({
    summary: 'List users with pagination and filters',
    description:
      'Retrieves paginated user accounts with optional filtering by role, activation status, or search string. Restricted to administrators.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated user list',
    type: AdminUsersListResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires ADMIN role' })
  async getUsers(
    @Query() query: AdminUsersQueryDto,
  ): Promise<AdminUsersListResponseDto> {
    return this.adminService.getUsers(query);
  }

  @Patch('users/:id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Activate or deactivate user account',
    description:
      'Modifies user active status. Deactivating an account immediately revokes all active refresh tokens and terminates active sessions. Restricted to administrators.',
  })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({
    status: 200,
    description: 'User status successfully updated',
    type: AdminUserStatusResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot deactivate own administrator account',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires ADMIN role' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUserStatus(
    @CurrentUser('userId') adminUserId: string,
    @Param('id') targetUserId: string,
    @Body() dto: UpdateUserStatusDto,
  ): Promise<AdminUserStatusResponseDto> {
    return this.adminService.updateUserStatus(adminUserId, targetUserId, dto);
  }

  @Get('subscriptions')
  @ApiOperation({
    summary: 'Subscription breakdown and active subscribers',
    description:
      'Provides breakdown of subscriptions across FREE and PREMIUM tiers, along with detailed subscriber usage quotas. Restricted to administrators.',
  })
  @ApiResponse({
    status: 200,
    description: 'Subscriptions overview',
    type: AdminSubscriptionsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires ADMIN role' })
  async getSubscriptions(): Promise<AdminSubscriptionsResponseDto> {
    return this.adminService.getSubscriptionsOverview();
  }

  @Get('logs')
  @ApiOperation({
    summary: 'System API request logs',
    description:
      'Retrieves chronological API request logs with filtering by user, endpoint, method, or status code for monitoring and auditing. Restricted to administrators.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated API usage logs',
    type: AdminLogsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires ADMIN role' })
  async getLogs(
    @Query() query: AdminLogsQueryDto,
  ): Promise<AdminLogsResponseDto> {
    return this.adminService.getApiUsageLogs(query);
  }

  @Get('health')
  @ApiOperation({
    summary: 'Comprehensive system health and diagnostics',
    description:
      'Provides real-time health diagnostics including database roundtrip ping latency, memory utilization, and process status. Restricted to administrators.',
  })
  @ApiResponse({
    status: 200,
    description: 'System health diagnostics',
    type: AdminSystemHealthDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires ADMIN role' })
  async getHealth(): Promise<AdminSystemHealthDto> {
    return this.adminService.getSystemHealth();
  }
}
