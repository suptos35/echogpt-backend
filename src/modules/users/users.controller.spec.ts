import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: any;

  const mockProfile = {
    id: 'user-1',
    email: 'user@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: 'USER',
    isActive: true,
    subscription: {
      planType: 'FREE',
      status: 'ACTIVE',
      maxRequestsPerDay: 20,
      usedRequestsToday: 0,
      expiresAt: null,
    },
    createdAt: new Date(),
  };

  const mockUsersService = {
    getProfile: jest.fn(),
    updateProfile: jest.fn(),
    changePassword: jest.fn(),
    deleteAccount: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get(UsersService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      mockUsersService.getProfile.mockResolvedValue(mockProfile);

      const result = await controller.getProfile('user-1');

      expect(result).toEqual(mockProfile);
      expect(usersService.getProfile).toHaveBeenCalledWith('user-1');
    });
  });

  describe('updateProfile', () => {
    it('should update and return modified profile', async () => {
      const updated = { ...mockProfile, firstName: 'Jane' };
      mockUsersService.updateProfile.mockResolvedValue(updated);

      const result = await controller.updateProfile('user-1', {
        firstName: 'Jane',
      });

      expect(result.firstName).toBe('Jane');
      expect(usersService.updateProfile).toHaveBeenCalledWith('user-1', {
        firstName: 'Jane',
      });
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      mockUsersService.changePassword.mockResolvedValue({
        success: true,
        message: 'Password changed successfully',
      });

      const result = await controller.changePassword('user-1', {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
      });

      expect(result.success).toBe(true);
      expect(usersService.changePassword).toHaveBeenCalledWith('user-1', {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
      });
    });
  });

  describe('deleteAccount', () => {
    it('should deactivate account and revoke sessions', async () => {
      mockUsersService.deleteAccount.mockResolvedValue({
        success: true,
        message: 'Account deactivated successfully',
      });

      const result = await controller.deleteAccount('user-1');

      expect(result.success).toBe(true);
      expect(usersService.deleteAccount).toHaveBeenCalledWith('user-1');
    });
  });

  describe('adminOnlyTest', () => {
    it('should return admin access message', async () => {
      const result = await controller.adminOnlyTest();
      expect(result).toHaveProperty('message');
    });
  });
});
