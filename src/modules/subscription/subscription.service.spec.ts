import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { PlanType, SubscriptionStatus } from '@prisma/client';
import { SubscriptionService } from './subscription.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('SubscriptionService (Unit Tests)', () => {
  let service: SubscriptionService;
  let prisma: any;

  const mockSubscription = {
    id: 'sub-uuid-1',
    userId: 'user-uuid-1',
    planType: PlanType.FREE,
    status: SubscriptionStatus.ACTIVE,
    maxRequestsPerDay: 20,
    usedRequestsToday: 5,
    lastResetDate: new Date(),
    startDate: new Date(),
    expiresAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      subscription: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<SubscriptionService>(SubscriptionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSubscriptionStatus', () => {
    it('should return subscription status with correct remaining requests', async () => {
      prisma.subscription.findUnique.mockResolvedValue(mockSubscription);

      const result = await service.getSubscriptionStatus('user-uuid-1');

      expect(result).toBeDefined();
      expect(result.planType).toBe(PlanType.FREE);
      expect(result.status).toBe(SubscriptionStatus.ACTIVE);
      expect(result.maxRequestsPerDay).toBe(20);
      expect(result.usedRequestsToday).toBe(5);
      expect(result.remainingRequests).toBe(15);
    });

    it('should auto-reset usage if lastResetDate is from a previous day', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const staleSubscription = {
        ...mockSubscription,
        usedRequestsToday: 20,
        lastResetDate: yesterday,
      };

      prisma.subscription.findUnique.mockResolvedValue(staleSubscription);
      prisma.subscription.update.mockResolvedValue({
        ...staleSubscription,
        usedRequestsToday: 0,
        lastResetDate: new Date(),
      });

      const result = await service.getSubscriptionStatus('user-uuid-1');

      expect(prisma.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'sub-uuid-1' },
          data: expect.objectContaining({ usedRequestsToday: 0 }),
        }),
      );
      expect(result.usedRequestsToday).toBe(0);
      expect(result.remainingRequests).toBe(20);
    });

    it('should auto-create default FREE subscription if none exists for valid user', async () => {
      prisma.subscription.findUnique.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue({ id: 'user-uuid-1', email: 'test@user.com' });
      prisma.subscription.create.mockResolvedValue({
        ...mockSubscription,
        usedRequestsToday: 0,
      });

      const result = await service.getSubscriptionStatus('user-uuid-1');

      expect(prisma.subscription.create).toHaveBeenCalled();
      expect(result.planType).toBe(PlanType.FREE);
      expect(result.remainingRequests).toBe(20);
    });

    it('should throw NotFoundException if user does not exist', async () => {
      prisma.subscription.findUnique.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getSubscriptionStatus('unknown-user')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('upgradeSubscription', () => {
    it('should upgrade user from FREE to PREMIUM with 500 requests/day', async () => {
      prisma.subscription.findUnique.mockResolvedValue(mockSubscription);
      prisma.subscription.update.mockResolvedValue({
        ...mockSubscription,
        planType: PlanType.PREMIUM,
        maxRequestsPerDay: 500,
        status: SubscriptionStatus.ACTIVE,
      });

      const result = await service.upgradeSubscription('user-uuid-1');

      expect(result.planType).toBe(PlanType.PREMIUM);
      expect(result.maxRequestsPerDay).toBe(500);
      expect(prisma.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-uuid-1' },
          data: expect.objectContaining({
            planType: PlanType.PREMIUM,
            maxRequestsPerDay: 500,
            status: SubscriptionStatus.ACTIVE,
          }),
        }),
      );
    });
  });

  describe('downgradeSubscription', () => {
    it('should downgrade user from PREMIUM to FREE with 20 requests/day', async () => {
      prisma.subscription.findUnique.mockResolvedValue({
        ...mockSubscription,
        planType: PlanType.PREMIUM,
        maxRequestsPerDay: 500,
      });
      prisma.subscription.update.mockResolvedValue({
        ...mockSubscription,
        planType: PlanType.FREE,
        maxRequestsPerDay: 20,
      });

      const result = await service.downgradeSubscription('user-uuid-1');

      expect(result.planType).toBe(PlanType.FREE);
      expect(result.maxRequestsPerDay).toBe(20);
      expect(prisma.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-uuid-1' },
          data: expect.objectContaining({
            planType: PlanType.FREE,
            maxRequestsPerDay: 20,
            expiresAt: null,
          }),
        }),
      );
    });
  });

  describe('getRemainingRequests', () => {
    it('should return remaining requests count', async () => {
      prisma.subscription.findUnique.mockResolvedValue(mockSubscription);

      const result = await service.getRemainingRequests('user-uuid-1');

      expect(result).toEqual({ remainingRequests: 15 });
    });
  });

  describe('consumeQuota', () => {
    it('should increment usedRequestsToday and return updated remaining count if under quota', async () => {
      prisma.subscription.findUnique.mockResolvedValue({
        ...mockSubscription,
        usedRequestsToday: 10,
        maxRequestsPerDay: 20,
      });
      prisma.subscription.update.mockResolvedValue({
        ...mockSubscription,
        usedRequestsToday: 11,
        maxRequestsPerDay: 20,
      });

      const result = await service.consumeQuota('user-uuid-1');

      expect(result.allowed).toBe(true);
      expect(result.remainingRequests).toBe(9);
      expect(prisma.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-uuid-1' },
          data: expect.objectContaining({
            usedRequestsToday: { increment: 1 },
          }),
        }),
      );
    });

    it('should throw 429 Too Many Requests when daily quota is exhausted', async () => {
      prisma.subscription.findUnique.mockResolvedValue({
        ...mockSubscription,
        usedRequestsToday: 20,
        maxRequestsPerDay: 20,
      });

      await expect(service.consumeQuota('user-uuid-1')).rejects.toThrow(HttpException);
      try {
        await service.consumeQuota('user-uuid-1');
      } catch (err: any) {
        expect(err.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
        expect(err.message).toContain('Daily request quota exhausted');
      }
    });
  });
});
