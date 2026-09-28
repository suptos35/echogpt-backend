import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { RoleName, PlanType, SubscriptionStatus, ProviderType } from '@prisma/client';
import { AdminService } from './admin.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('AdminService', () => {
  let service: AdminService;
  let prisma: any;

  const mockPrismaService = {
    user: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    subscription: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    conversation: {
      count: jest.fn(),
    },
    message: {
      count: jest.fn(),
    },
    webSearch: {
      count: jest.fn(),
    },
    aiProvider: {
      count: jest.fn(),
      findFirst: jest.fn(),
    },
    apiUsageLog: {
      count: jest.fn(),
      aggregate: jest.fn(),
      findMany: jest.fn(),
    },
    refreshToken: {
      updateMany: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    prisma = module.get(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getDashboardStats', () => {
    it('should aggregate metrics from users, subscriptions, chats, searches, providers, and logs', async () => {
      // Mock user counts: total, active, inactive, verified
      prisma.user.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(8)  // active
        .mockResolvedValueOnce(2)  // inactive
        .mockResolvedValueOnce(9); // verified

      // Mock subscription counts: total, free, premium, active
      prisma.subscription.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(7)  // free
        .mockResolvedValueOnce(3)  // premium
        .mockResolvedValueOnce(9); // active

      // Mock conversation and message counts
      prisma.conversation.count.mockResolvedValue(25);
      prisma.message.count.mockResolvedValue(120);

      // Mock search counts: total, cached
      prisma.webSearch.count
        .mockResolvedValueOnce(50) // total
        .mockResolvedValueOnce(20); // cached

      // Mock provider counts and default
      prisma.aiProvider.count
        .mockResolvedValueOnce(3) // total
        .mockResolvedValueOnce(2); // active
      prisma.aiProvider.findFirst.mockResolvedValue({
        displayName: 'Google Gemini',
        name: ProviderType.GEMINI,
        defaultModel: 'gemini-1.5-flash',
      });

      // Mock API usage logs: total, today, avg latency
      prisma.apiUsageLog.count
        .mockResolvedValueOnce(500) // total
        .mockResolvedValueOnce(45); // today
      prisma.apiUsageLog.aggregate.mockResolvedValue({
        _avg: { latencyMs: 124.5 },
      });

      const stats = await service.getDashboardStats();

      expect(stats).toBeDefined();
      expect(stats.users.total).toBe(10);
      expect(stats.users.active).toBe(8);
      expect(stats.users.inactive).toBe(2);
      expect(stats.users.verified).toBe(9);

      expect(stats.subscriptions.total).toBe(10);
      expect(stats.subscriptions.free).toBe(7);
      expect(stats.subscriptions.premium).toBe(3);

      expect(stats.conversations.total).toBe(25);
      expect(stats.conversations.totalMessages).toBe(120);

      expect(stats.searches.total).toBe(50);
      expect(stats.searches.cachedCount).toBe(20);

      expect(stats.providers.total).toBe(3);
      expect(stats.providers.active).toBe(2);
      expect(stats.providers.defaultProvider).toBe('Google Gemini');

      expect(stats.apiUsage.totalRequests).toBe(500);
      expect(stats.apiUsage.requestsToday).toBe(45);
      expect(stats.apiUsage.avgLatencyMs).toBe(125);
    });
  });

  describe('getUsers', () => {
    it('should return paginated list of users with role and subscription info', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          email: 'user1@example.com',
          firstName: 'Alice',
          lastName: 'Smith',
          isActive: true,
          isVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          role: { name: RoleName.USER },
          subscription: {
            planType: PlanType.FREE,
            status: SubscriptionStatus.ACTIVE,
            usedRequestsToday: 5,
            maxRequestsPerDay: 20,
          },
        },
      ];

      prisma.user.findMany.mockResolvedValue(mockUsers);
      prisma.user.count.mockResolvedValue(1);

      const result = await service.getUsers({ page: 1, limit: 10 });

      expect(result.users).toHaveLength(1);
      expect(result.users[0].email).toBe('user1@example.com');
      expect(result.users[0].role).toBe(RoleName.USER);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.totalPages).toBe(1);
    });

    it('should filter users by role, active status, and search string', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);

      await service.getUsers({
        role: RoleName.ADMIN,
        isActive: true,
        search: 'admin',
        page: 2,
        limit: 5,
      });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5,
          take: 5,
          where: expect.objectContaining({
            role: { name: RoleName.ADMIN },
            isActive: true,
            OR: expect.arrayContaining([
              { email: { contains: 'admin', mode: 'insensitive' } },
            ]),
          }),
        }),
      );
    });
  });

  describe('updateUserStatus', () => {
    it('should prevent an admin from deactivating their own account', async () => {
      await expect(
        service.updateUserStatus('admin-1', 'admin-1', { isActive: false }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if target user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.updateUserStatus('admin-1', 'missing-user', { isActive: false }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should deactivate user and revoke all active refresh tokens', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-2',
        email: 'user2@example.com',
        isActive: true,
      });
      prisma.user.update.mockResolvedValue({
        id: 'user-2',
        email: 'user2@example.com',
        isActive: false,
      });
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.updateUserStatus('admin-1', 'user-2', {
        isActive: false,
      });

      expect(result.id).toBe('user-2');
      expect(result.isActive).toBe(false);
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-2', isRevoked: false },
        data: { isRevoked: true },
      });
    });

    it('should activate a previously deactivated user without revoking tokens', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-3',
        email: 'user3@example.com',
        isActive: false,
      });
      prisma.user.update.mockResolvedValue({
        id: 'user-3',
        email: 'user3@example.com',
        isActive: true,
      });

      const result = await service.updateUserStatus('admin-1', 'user-3', {
        isActive: true,
      });

      expect(result.isActive).toBe(true);
      expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('getSubscriptionsOverview', () => {
    it('should aggregate subscription tiers and list active subscriptions with user data', async () => {
      prisma.subscription.count
        .mockResolvedValueOnce(50) // total
        .mockResolvedValueOnce(40) // free
        .mockResolvedValueOnce(10) // premium
        .mockResolvedValueOnce(48) // active
        .mockResolvedValueOnce(2)  // cancelled
        .mockResolvedValueOnce(0); // expired

      prisma.subscription.findMany.mockResolvedValue([
        {
          id: 'sub-1',
          planType: PlanType.PREMIUM,
          status: SubscriptionStatus.ACTIVE,
          maxRequestsPerDay: 500,
          usedRequestsToday: 12,
          lastResetDate: new Date(),
          expiresAt: null,
          user: {
            id: 'user-1',
            email: 'vip@example.com',
            firstName: 'VIP',
            lastName: 'User',
          },
        },
      ]);

      const overview = await service.getSubscriptionsOverview();

      expect(overview.summary.total).toBe(50);
      expect(overview.summary.free).toBe(40);
      expect(overview.summary.premium).toBe(10);
      expect(overview.summary.active).toBe(48);
      expect(overview.summary.cancelled).toBe(2);
      expect(overview.subscriptions).toHaveLength(1);
      expect(overview.subscriptions[0].userEmail).toBe('vip@example.com');
    });
  });

  describe('getApiUsageLogs', () => {
    it('should return paginated API usage logs with optional filters', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          userId: 'user-1',
          endpoint: '/api/chat/send-prompt',
          method: 'POST',
          statusCode: 200,
          latencyMs: 340,
          ipAddress: '127.0.0.1',
          userAgent: 'Chrome',
          createdAt: new Date(),
          user: { email: 'chatuser@example.com' },
        },
      ];

      prisma.apiUsageLog.findMany.mockResolvedValue(mockLogs);
      prisma.apiUsageLog.count.mockResolvedValue(1);

      const result = await service.getApiUsageLogs({
        page: 1,
        limit: 20,
        endpoint: '/api/chat',
        statusCode: 200,
      });

      expect(result.logs).toHaveLength(1);
      expect(result.logs[0].endpoint).toBe('/api/chat/send-prompt');
      expect(result.logs[0].userEmail).toBe('chatuser@example.com');
      expect(result.pagination.total).toBe(1);
    });
  });

  describe('getSystemHealth', () => {
    it('should query database connectivity and report system resource metrics', async () => {
      prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

      const health = await service.getSystemHealth();

      expect(health.status).toBe('healthy');
      expect(health.database.status).toBe('connected');
      expect(typeof health.database.latencyMs).toBe('number');
      expect(typeof health.uptime).toBe('number');
      expect(health.memory).toHaveProperty('rssMb');
      expect(health.memory).toHaveProperty('heapUsedMb');
      expect(health.process).toHaveProperty('nodeVersion');
    });

    it('should report degraded or unhealthy status when database query fails', async () => {
      prisma.$queryRaw.mockRejectedValue(new Error('Connection lost'));

      const health = await service.getSystemHealth();

      expect(health.status).toBe('unhealthy');
      expect(health.database.status).toBe('disconnected');
    });
  });
});
