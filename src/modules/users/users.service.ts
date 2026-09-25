import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UserProfileDto } from './dto/user-profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieve current user profile with role and subscription plan details
   */
  async getProfile(userId: string): Promise<UserProfileDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: true,
        subscription: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role.name,
      isActive: user.isActive,
      subscription: {
        planType: user.subscription?.planType || 'FREE',
        status: user.subscription?.status || 'ACTIVE',
        maxRequestsPerDay: user.subscription?.maxRequestsPerDay || 20,
        usedRequestsToday: user.subscription?.usedRequestsToday || 0,
        expiresAt: user.subscription?.expiresAt || null,
      },
      createdAt: user.createdAt,
    };
  }

  /**
   * Update first and last name for current user profile
   */
  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<UserProfileDto> {
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
      },
      include: {
        role: true,
        subscription: true,
      },
    });

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      role: updatedUser.role.name,
      isActive: updatedUser.isActive,
      subscription: {
        planType: updatedUser.subscription?.planType || 'FREE',
        status: updatedUser.subscription?.status || 'ACTIVE',
        maxRequestsPerDay: updatedUser.subscription?.maxRequestsPerDay || 20,
        usedRequestsToday: updatedUser.subscription?.usedRequestsToday || 0,
        expiresAt: updatedUser.subscription?.expiresAt || null,
      },
      createdAt: updatedUser.createdAt,
    };
  }

  /**
   * Change user password, verifying current password and revoking old refresh tokens
   */
  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
  ): Promise<{ success: boolean; message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User account not found');
    }

    const isMatch = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Current password does not match');
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('New password must be different from current password');
    }

    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(dto.newPassword, saltRounds);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    // Invalidate all active sessions for security
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });

    return {
      success: true,
      message: 'Password changed successfully',
    };
  }

  /**
   * Deactivate user account and revoke all active sessions
   */
  async deleteAccount(userId: string): Promise<{ success: boolean; message: string }> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });

    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });

    return {
      success: true,
      message: 'Account deleted successfully',
    };
  }
}
