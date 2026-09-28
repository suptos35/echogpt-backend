import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PlanType, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
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

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * System-wide dashboard statistics
   */
  async getDashboardStats(): Promise<AdminDashboardResponseDto> {
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);

    const [
      totalUsers,
      activeUsers,
      inactiveUsers,
      verifiedUsers,
      totalSubscriptions,
      freeSubscriptions,
      premiumSubscriptions,
      activeSubscriptions,
      totalConversations,
      totalMessages,
      totalSearches,
      cachedSearches,
      totalProviders,
      activeProviders,
      defaultProvider,
      totalLogs,
      logsToday,
      avgLatency,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { isActive: false } }),
      this.prisma.user.count({ where: { isVerified: true } }),
      this.prisma.subscription.count(),
      this.prisma.subscription.count({ where: { planType: PlanType.FREE } }),
      this.prisma.subscription.count({ where: { planType: PlanType.PREMIUM } }),
      this.prisma.subscription.count({
        where: { status: SubscriptionStatus.ACTIVE },
      }),
      this.prisma.conversation.count(),
      this.prisma.message.count(),
      this.prisma.webSearch.count(),
      this.prisma.webSearch.count({ where: { cached: true } }),
      this.prisma.aiProvider.count(),
      this.prisma.aiProvider.count({ where: { isEnabled: true } }),
      this.prisma.aiProvider.findFirst({ where: { isDefault: true } }),
      this.prisma.apiUsageLog.count(),
      this.prisma.apiUsageLog.count({
        where: { createdAt: { gte: startOfToday } },
      }),
      this.prisma.apiUsageLog.aggregate({ _avg: { latencyMs: true } }),
    ]);

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        inactive: inactiveUsers,
        verified: verifiedUsers,
      },
      subscriptions: {
        total: totalSubscriptions,
        free: freeSubscriptions,
        premium: premiumSubscriptions,
        active: activeSubscriptions,
      },
      conversations: {
        total: totalConversations,
        totalMessages,
      },
      searches: {
        total: totalSearches,
        cachedCount: cachedSearches,
      },
      providers: {
        total: totalProviders,
        active: activeProviders,
        defaultProvider:
          defaultProvider?.displayName || defaultProvider?.name || null,
      },
      apiUsage: {
        totalRequests: totalLogs,
        requestsToday: logsToday,
        avgLatencyMs: Math.round(avgLatency._avg?.latencyMs || 0),
      },
    };
  }

  /**
   * Paginated user list with role and status filters
   */
  async getUsers(
    query: AdminUsersQueryDto,
  ): Promise<AdminUsersListResponseDto> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 10));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.role) {
      where.role = { name: query.role };
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.search) {
      where.OR = [
        { email: { contains: query.search, mode: 'insensitive' } },
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        include: {
          role: true,
          subscription: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role.name,
        isActive: u.isActive,
        isVerified: u.isVerified,
        subscription: u.subscription
          ? {
              planType: u.subscription.planType,
              status: u.subscription.status,
              maxRequestsPerDay: u.subscription.maxRequestsPerDay,
              usedRequestsToday: u.subscription.usedRequestsToday,
            }
          : null,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Activate or deactivate a user account and revoke active sessions on deactivation
   */
  async updateUserStatus(
    adminUserId: string,
    targetUserId: string,
    dto: UpdateUserStatusDto,
  ): Promise<AdminUserStatusResponseDto> {
    if (adminUserId === targetUserId && !dto.isActive) {
      throw new BadRequestException(
        'Cannot deactivate your own administrator account',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.update({
      where: { id: targetUserId },
      data: { isActive: dto.isActive },
    });

    if (!dto.isActive) {
      await this.prisma.refreshToken.updateMany({
        where: { userId: targetUserId, isRevoked: false },
        data: { isRevoked: true },
      });
      this.logger.warn(
        `Admin ${adminUserId} deactivated user account ${targetUserId} and revoked sessions`,
      );
    } else {
      this.logger.log(
        `Admin ${adminUserId} activated user account ${targetUserId}`,
      );
    }

    return {
      id: targetUserId,
      email: user.email,
      isActive: dto.isActive,
      message: dto.isActive
        ? 'User account has been activated'
        : 'User account has been deactivated and active sessions revoked',
    };
  }

  /**
   * Subscriptions overview and breakdown by plan and status
   */
  async getSubscriptionsOverview(): Promise<AdminSubscriptionsResponseDto> {
    const [total, free, premium, active, cancelled, expired, subscriptions] =
      await Promise.all([
        this.prisma.subscription.count(),
        this.prisma.subscription.count({ where: { planType: PlanType.FREE } }),
        this.prisma.subscription.count({
          where: { planType: PlanType.PREMIUM },
        }),
        this.prisma.subscription.count({
          where: { status: SubscriptionStatus.ACTIVE },
        }),
        this.prisma.subscription.count({
          where: { status: SubscriptionStatus.CANCELLED },
        }),
        this.prisma.subscription.count({
          where: { status: SubscriptionStatus.EXPIRED },
        }),
        this.prisma.subscription.findMany({
          take: 50,
          include: {
            user: true,
          },
          orderBy: { updatedAt: 'desc' },
        }),
      ]);

    return {
      summary: {
        total,
        free,
        premium,
        active,
        cancelled,
        expired,
      },
      subscriptions: subscriptions.map((sub) => ({
        id: sub.id,
        userId: sub.userId,
        userEmail: sub.user?.email || 'Unknown',
        userName:
          [sub.user?.firstName, sub.user?.lastName].filter(Boolean).join(' ') ||
          'N/A',
        planType: sub.planType,
        status: sub.status,
        maxRequestsPerDay: sub.maxRequestsPerDay,
        usedRequestsToday: sub.usedRequestsToday,
        lastResetDate: sub.lastResetDate,
        expiresAt: sub.expiresAt,
      })),
    };
  }

  /**
   * Paginated API usage logs for auditing and monitoring
   */
  async getApiUsageLogs(
    query: AdminLogsQueryDto,
  ): Promise<AdminLogsResponseDto> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.userId) {
      where.userId = query.userId;
    }

    if (query.endpoint) {
      where.endpoint = { contains: query.endpoint, mode: 'insensitive' };
    }

    if (query.statusCode) {
      where.statusCode = query.statusCode;
    }

    if (query.method) {
      where.method = { equals: query.method, mode: 'insensitive' };
    }

    const [logs, total] = await Promise.all([
      this.prisma.apiUsageLog.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: { email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.apiUsageLog.count({ where }),
    ]);

    return {
      logs: logs.map((log) => ({
        id: log.id,
        userId: log.userId,
        userEmail: log.user?.email || null,
        endpoint: log.endpoint,
        method: log.method,
        statusCode: log.statusCode,
        latencyMs: log.latencyMs,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        createdAt: log.createdAt,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Comprehensive system health and process diagnostics
   */
  async getSystemHealth(): Promise<AdminSystemHealthDto> {
    let dbStatus: 'connected' | 'disconnected' = 'connected';
    let dbLatency = 0;
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    const dbStartTime = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbLatency = Date.now() - dbStartTime;
    } catch (error) {
      this.logger.error(`Database health check failed: ${error.message}`);
      dbStatus = 'disconnected';
      dbLatency = -1;
      status = 'unhealthy';
    }

    const mem = process.memoryUsage();

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      database: {
        status: dbStatus,
        latencyMs: dbLatency,
      },
      memory: {
        rssMb: Math.round((mem.rss / 1024 / 1024) * 10) / 10,
        heapTotalMb: Math.round((mem.heapTotal / 1024 / 1024) * 10) / 10,
        heapUsedMb: Math.round((mem.heapUsed / 1024 / 1024) * 10) / 10,
        externalMb: Math.round((mem.external / 1024 / 1024) * 10) / 10,
      },
      process: {
        nodeVersion: process.version,
        platform: process.platform,
        pid: process.pid,
      },
    };
  }
}
