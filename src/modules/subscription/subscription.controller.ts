import {
  Controller,
  Get,
  Post,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SubscriptionService } from './subscription.service';
import {
  SubscriptionStatusDto,
  RemainingRequestsDto,
} from './dto/subscription-status.dto';

@ApiTags('Subscription Management')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('api/subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get('status')
  @ApiOperation({
    summary: 'Get subscription status',
    description:
      'Retrieves current subscription plan, daily limits, and remaining query quota',
  })
  @ApiResponse({
    status: 200,
    description: 'Current subscription plan details and remaining quota',
    type: SubscriptionStatusDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getStatus(
    @CurrentUser('userId') userId: string,
  ): Promise<SubscriptionStatusDto> {
    return this.subscriptionService.getSubscriptionStatus(userId);
  }

  @Post('upgrade')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Upgrade subscription to PREMIUM',
    description:
      'Upgrades user subscription to the PREMIUM plan with 500 requests per day',
  })
  @ApiResponse({
    status: 200,
    description: 'Subscription upgraded successfully',
    type: SubscriptionStatusDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async upgrade(
    @CurrentUser('userId') userId: string,
  ): Promise<SubscriptionStatusDto> {
    return this.subscriptionService.upgradeSubscription(userId);
  }

  @Post('downgrade')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Downgrade subscription to FREE',
    description:
      'Downgrades user subscription to the FREE plan with 20 requests per day',
  })
  @ApiResponse({
    status: 200,
    description: 'Subscription downgraded successfully',
    type: SubscriptionStatusDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async downgrade(
    @CurrentUser('userId') userId: string,
  ): Promise<SubscriptionStatusDto> {
    return this.subscriptionService.downgradeSubscription(userId);
  }

  @Get('remaining-requests')
  @ApiOperation({
    summary: 'Get remaining requests',
    description:
      'Returns the exact number of queries the user can execute today',
  })
  @ApiResponse({
    status: 200,
    description: 'Remaining query count for the current 24-hour cycle',
    type: RemainingRequestsDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getRemainingRequests(
    @CurrentUser('userId') userId: string,
  ): Promise<RemainingRequestsDto> {
    return this.subscriptionService.getRemainingRequests(userId);
  }
}
