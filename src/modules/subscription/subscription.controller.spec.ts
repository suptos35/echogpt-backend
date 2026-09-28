import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';
import { PlanType, SubscriptionStatus } from '@prisma/client';

describe('SubscriptionController', () => {
  let controller: SubscriptionController;
  let subscriptionService: any;

  const mockStatus = {
    planType: PlanType.FREE,
    status: SubscriptionStatus.ACTIVE,
    maxRequestsPerDay: 20,
    usedRequestsToday: 3,
    remainingRequests: 17,
    lastResetDate: new Date(),
    expiresAt: null,
  };

  const mockSubscriptionService = {
    getSubscriptionStatus: jest.fn(),
    upgradeSubscription: jest.fn(),
    downgradeSubscription: jest.fn(),
    getRemainingRequests: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubscriptionController],
      providers: [
        {
          provide: SubscriptionService,
          useValue: mockSubscriptionService,
        },
      ],
    }).compile();

    controller = module.get<SubscriptionController>(SubscriptionController);
    subscriptionService = module.get(SubscriptionService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getStatus', () => {
    it('should return subscription status', async () => {
      mockSubscriptionService.getSubscriptionStatus.mockResolvedValue(
        mockStatus,
      );

      const result = await controller.getStatus('user-1');

      expect(result).toEqual(mockStatus);
      expect(subscriptionService.getSubscriptionStatus).toHaveBeenCalledWith(
        'user-1',
      );
    });
  });

  describe('upgrade', () => {
    it('should upgrade user to PREMIUM', async () => {
      const premiumStatus = {
        ...mockStatus,
        planType: PlanType.PREMIUM,
        maxRequestsPerDay: 500,
      };
      mockSubscriptionService.upgradeSubscription.mockResolvedValue(
        premiumStatus,
      );

      const result = await controller.upgrade('user-1');

      expect(result.planType).toBe(PlanType.PREMIUM);
      expect(subscriptionService.upgradeSubscription).toHaveBeenCalledWith(
        'user-1',
      );
    });
  });

  describe('downgrade', () => {
    it('should downgrade user to FREE', async () => {
      mockSubscriptionService.downgradeSubscription.mockResolvedValue(
        mockStatus,
      );

      const result = await controller.downgrade('user-1');

      expect(result.planType).toBe(PlanType.FREE);
      expect(subscriptionService.downgradeSubscription).toHaveBeenCalledWith(
        'user-1',
      );
    });
  });

  describe('getRemainingRequests', () => {
    it('should return remaining request count', async () => {
      mockSubscriptionService.getRemainingRequests.mockResolvedValue({
        remainingRequests: 17,
      });

      const result = await controller.getRemainingRequests('user-1');

      expect(result.remainingRequests).toBe(17);
      expect(subscriptionService.getRemainingRequests).toHaveBeenCalledWith(
        'user-1',
      );
    });
  });
});
