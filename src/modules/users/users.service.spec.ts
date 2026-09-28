import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('UsersService (TDD)', () => {
  let service: UsersService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      refreshToken: {
        deleteMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getProfile', () => {
    it('should throw NotFoundException if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getProfile('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return user profile with role and subscription details', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'user@echogpt.app',
        firstName: 'Jane',
        lastName: 'Doe',
        isActive: true,
        createdAt: new Date(),
        role: { name: 'USER' },
        subscription: {
          planType: 'FREE',
          status: 'ACTIVE',
          maxRequestsPerDay: 20,
          usedRequestsToday: 5,
        },
      };

      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getProfile('user-1');
      expect(result).toHaveProperty('id', 'user-1');
      expect(result).toHaveProperty('email', 'user@echogpt.app');
      expect(result.role).toBe('USER');
      expect(result.subscription.planType).toBe('FREE');
      expect(result.subscription.usedRequestsToday).toBe(5);
    });
  });

  describe('updateProfile', () => {
    it('should update and return updated user details', async () => {
      prisma.user.update.mockResolvedValue({
        id: 'user-1',
        email: 'user@echogpt.app',
        firstName: 'UpdatedFirst',
        lastName: 'UpdatedLast',
        role: { name: 'USER' },
        subscription: { planType: 'FREE' },
      });

      const result = await service.updateProfile('user-1', {
        firstName: 'UpdatedFirst',
        lastName: 'UpdatedLast',
      });

      expect(result.firstName).toBe('UpdatedFirst');
      expect(result.lastName).toBe('UpdatedLast');
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: { firstName: 'UpdatedFirst', lastName: 'UpdatedLast' },
        }),
      );
    });
  });

  describe('changePassword', () => {
    it('should throw UnauthorizedException if current password is incorrect', async () => {
      const currentHashed = await bcrypt.hash('CorrectPassword123!', 10);
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        passwordHash: currentHashed,
      });

      await expect(
        service.changePassword('user-1', {
          currentPassword: 'WrongPassword!',
          newPassword: 'NewPassword123!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException if new password is identical to current password', async () => {
      const currentHashed = await bcrypt.hash('SamePassword123!', 10);
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        passwordHash: currentHashed,
      });

      await expect(
        service.changePassword('user-1', {
          currentPassword: 'SamePassword123!',
          newPassword: 'SamePassword123!',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully update password hash and revoke active refresh tokens', async () => {
      const currentHashed = await bcrypt.hash('OldPassword123!', 10);
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        passwordHash: currentHashed,
      });
      prisma.user.update.mockResolvedValue({});
      prisma.refreshToken.deleteMany.mockResolvedValue({ count: 2 });

      const result = await service.changePassword('user-1', {
        currentPassword: 'OldPassword123!',
        newPassword: 'BrandNewPassword123!',
      });

      expect(result).toEqual({
        success: true,
        message: 'Password changed successfully',
      });
      expect(prisma.user.update).toHaveBeenCalled();
      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });
  });

  describe('deleteAccount', () => {
    it('should deactivate user account and invalidate all sessions', async () => {
      prisma.user.update.mockResolvedValue({ id: 'user-1', isActive: false });
      prisma.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.deleteAccount('user-1');
      expect(result).toEqual({
        success: true,
        message: 'Account deleted successfully',
      });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { isActive: false },
      });
      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });
  });
});
