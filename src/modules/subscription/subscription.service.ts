import {
  Injectable,
  NotFoundException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { PlanType, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  SubscriptionStatusDto,
  RemainingRequestsDto,
} from './dto/subscription-status.dto';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  // Quota configuration constants
  public static readonly FREE_DAILY_QUOTA = 20;
  public static readonly PREMIUM_DAILY_QUOTA = 500;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fetch current subscription status, triggering daily reset if calendar day changed
   */
  async getSubscriptionStatus(userId: string): Promise<SubscriptionStatusDto> {
    let subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User account not found');
      }

      subscription = await this.prisma.subscription.create({
        data: {
          userId,
          planType: PlanType.FREE,
          status: SubscriptionStatus.ACTIVE,
          maxRequestsPerDay: SubscriptionService.FREE_DAILY_QUOTA,
          usedRequestsToday: 0,
          lastResetDate: new Date(),
          startDate: new Date(),
        },
      });
      this.logger.log(
        `Initialized default FREE subscription for user: ${userId}`,
      );
    }

    // Check if daily quota needs to be reset
    subscription = await this.checkAndPerformDailyReset(subscription);

    const remainingRequests = Math.max(
      0,
      subscription.maxRequestsPerDay - subscription.usedRequestsToday,
    );

    return {
      planType: subscription.planType,
      status: subscription.status,
      maxRequestsPerDay: subscription.maxRequestsPerDay,
      usedRequestsToday: subscription.usedRequestsToday,
      remainingRequests,
      startDate: subscription.startDate,
      lastResetDate: subscription.lastResetDate,
      expiresAt: subscription.expiresAt,
    };
  }

  /**
   * Upgrade user to PREMIUM plan with 500 requests per day
   */
  async upgradeSubscription(userId: string): Promise<SubscriptionStatusDto> {
    // Ensure subscription exists & reset if necessary
    await this.getSubscriptionStatus(userId);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30-day billing cycle

    const updated = await this.prisma.subscription.update({
      where: { userId },
      data: {
        planType: PlanType.PREMIUM,
        maxRequestsPerDay: SubscriptionService.PREMIUM_DAILY_QUOTA,
        status: SubscriptionStatus.ACTIVE,
        expiresAt,
      },
    });

    this.logger.log(`User upgraded to PREMIUM tier: userId=${userId}`);

    const remainingRequests = Math.max(
      0,
      updated.maxRequestsPerDay - updated.usedRequestsToday,
    );

    return {
      planType: updated.planType,
      status: updated.status,
      maxRequestsPerDay: updated.maxRequestsPerDay,
      usedRequestsToday: updated.usedRequestsToday,
      remainingRequests,
      startDate: updated.startDate,
      lastResetDate: updated.lastResetDate,
      expiresAt: updated.expiresAt,
    };
  }

  /**
   * Downgrade user back to FREE plan with 20 requests per day
   */
  async downgradeSubscription(userId: string): Promise<SubscriptionStatusDto> {
    await this.getSubscriptionStatus(userId);

    const updated = await this.prisma.subscription.update({
      where: { userId },
      data: {
        planType: PlanType.FREE,
        maxRequestsPerDay: SubscriptionService.FREE_DAILY_QUOTA,
        status: SubscriptionStatus.ACTIVE,
        expiresAt: null,
      },
    });

    this.logger.log(`User downgraded to FREE tier: userId=${userId}`);

    const remainingRequests = Math.max(
      0,
      updated.maxRequestsPerDay - updated.usedRequestsToday,
    );

    return {
      planType: updated.planType,
      status: updated.status,
      maxRequestsPerDay: updated.maxRequestsPerDay,
      usedRequestsToday: updated.usedRequestsToday,
      remainingRequests,
      startDate: updated.startDate,
      lastResetDate: updated.lastResetDate,
      expiresAt: updated.expiresAt,
    };
  }

  /**
   * Return remaining request balance for the current day
   */
  async getRemainingRequests(userId: string): Promise<RemainingRequestsDto> {
    const status = await this.getSubscriptionStatus(userId);
    return {
      remainingRequests: status.remainingRequests,
    };
  }

  /**
   * Decrement quota for a requested operation; enforces rate limit (429) if quota is exhausted
   */
  async consumeQuota(
    userId: string,
  ): Promise<{ allowed: boolean; remainingRequests: number }> {
    const status = await this.getSubscriptionStatus(userId);

    if (status.usedRequestsToday >= status.maxRequestsPerDay) {
      this.logger.warn(
        `Daily request quota exhausted for userId=${userId} (${status.usedRequestsToday}/${status.maxRequestsPerDay})`,
      );
      throw new HttpException(
        'Daily request quota exhausted. Please upgrade your subscription or try again tomorrow.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const updated = await this.prisma.subscription.update({
      where: { userId },
      data: {
        usedRequestsToday: { increment: 1 },
      },
    });

    const remaining = Math.max(
      0,
      updated.maxRequestsPerDay - updated.usedRequestsToday,
    );
    return {
      allowed: true,
      remainingRequests: remaining,
    };
  }

  /**
   * Daily reset logic: compares UTC calendar day and resets usedRequestsToday to 0 if a new day started
   */
  private async checkAndPerformDailyReset(subscription: any): Promise<any> {
    const now = new Date();
    const lastReset = new Date(subscription.lastResetDate);

    const isDifferentDay =
      lastReset.getUTCFullYear() !== now.getUTCFullYear() ||
      lastReset.getUTCMonth() !== now.getUTCMonth() ||
      lastReset.getUTCDate() !== now.getUTCDate();

    if (isDifferentDay) {
      const reset = await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          usedRequestsToday: 0,
          lastResetDate: now,
        },
      });
      this.logger.log(
        `Daily quota automatically reset to 0 for userId: ${subscription.userId}`,
      );
      return reset;
    }

    return subscription;
  }
}
