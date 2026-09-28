import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

describe('AdminController', () => {
  let controller: AdminController;
  let adminService: any;

  const mockDashboard = {
    users: { total: 10, active: 8, inactive: 2, verified: 9 },
    subscriptions: { total: 10, free: 7, premium: 3, active: 9 },
    conversations: { total: 25, totalMessages: 120 },
    searches: { total: 50, cachedCount: 20 },
    providers: { total: 3, active: 2, defaultProvider: 'Google Gemini' },
    apiUsage: { totalRequests: 500, requestsToday: 45, avgLatencyMs: 125 },
  };

  const mockAdminService = {
    getDashboardStats: jest.fn(),
    getUsers: jest.fn(),
    updateUserStatus: jest.fn(),
    getSubscriptionsOverview: jest.fn(),
    getApiUsageLogs: jest.fn(),
    getSystemHealth: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        {
          provide: AdminService,
          useValue: mockAdminService,
        },
      ],
    }).compile();

    controller = module.get<AdminController>(AdminController);
    adminService = module.get(AdminService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getDashboard', () => {
    it('should return system-wide dashboard stats', async () => {
      mockAdminService.getDashboardStats.mockResolvedValue(mockDashboard);

      const result = await controller.getDashboard();

      expect(result).toEqual(mockDashboard);
      expect(adminService.getDashboardStats).toHaveBeenCalled();
    });
  });

  describe('getUsers', () => {
    it('should return paginated user list', async () => {
      const mockUsers = {
        users: [],
        pagination: { total: 0, page: 1, limit: 10, totalPages: 1 },
      };
      mockAdminService.getUsers.mockResolvedValue(mockUsers);

      const query = { page: 1, limit: 10 };
      const result = await controller.getUsers(query);

      expect(result).toEqual(mockUsers);
      expect(adminService.getUsers).toHaveBeenCalledWith(query);
    });
  });

  describe('updateUserStatus', () => {
    it('should update user status', async () => {
      const response = {
        id: 'user-2',
        email: 'user2@example.com',
        isActive: false,
        message: 'User account has been deactivated',
      };
      mockAdminService.updateUserStatus.mockResolvedValue(response);

      const result = await controller.updateUserStatus('admin-1', 'user-2', {
        isActive: false,
      });

      expect(result).toEqual(response);
      expect(adminService.updateUserStatus).toHaveBeenCalledWith(
        'admin-1',
        'user-2',
        {
          isActive: false,
        },
      );
    });
  });

  describe('getSubscriptions', () => {
    it('should return subscriptions overview', async () => {
      const mockSubs = {
        summary: {
          total: 10,
          free: 7,
          premium: 3,
          active: 10,
          cancelled: 0,
          expired: 0,
        },
        subscriptions: [],
      };
      mockAdminService.getSubscriptionsOverview.mockResolvedValue(mockSubs);

      const result = await controller.getSubscriptions();

      expect(result).toEqual(mockSubs);
      expect(adminService.getSubscriptionsOverview).toHaveBeenCalled();
    });
  });

  describe('getLogs', () => {
    it('should return paginated API usage logs', async () => {
      const mockLogs = {
        logs: [],
        pagination: { total: 0, page: 1, limit: 20, totalPages: 1 },
      };
      mockAdminService.getApiUsageLogs.mockResolvedValue(mockLogs);

      const query = { page: 1, limit: 20 };
      const result = await controller.getLogs(query);

      expect(result).toEqual(mockLogs);
      expect(adminService.getApiUsageLogs).toHaveBeenCalledWith(query);
    });
  });

  describe('getHealth', () => {
    it('should return system diagnostics', async () => {
      const mockHealth = {
        status: 'healthy' as const,
        timestamp: new Date().toISOString(),
        uptime: 3600,
        database: { status: 'connected' as const, latencyMs: 5 },
        memory: { rssMb: 100, heapTotalMb: 80, heapUsedMb: 60, externalMb: 20 },
        process: { nodeVersion: 'v22.14.0', platform: 'linux', pid: 12345 },
      };
      mockAdminService.getSystemHealth.mockResolvedValue(mockHealth);

      const result = await controller.getHealth();

      expect(result).toEqual(mockHealth);
      expect(adminService.getSystemHealth).toHaveBeenCalled();
    });
  });
});
