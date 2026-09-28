import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RoleName, PlanType } from '@prisma/client';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: any;

  const mockAuthResponse = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    tokenType: 'Bearer',
    expiresIn: 900,
    user: {
      id: 'user-uuid-1',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: RoleName.USER,
      planType: PlanType.FREE,
    },
  };

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    refreshTokens: jest.fn(),
    logout: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user and return auth tokens', async () => {
      mockAuthService.register.mockResolvedValue(mockAuthResponse);

      const result = await controller.register({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
      });

      expect(result).toEqual(mockAuthResponse);
      expect(authService.register).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
      });
    });
  });

  describe('login', () => {
    it('should authenticate user and return auth tokens', async () => {
      mockAuthService.login.mockResolvedValue(mockAuthResponse);

      const result = await controller.login({
        email: 'test@example.com',
        password: 'Password123!',
      });

      expect(result).toEqual(mockAuthResponse);
      expect(authService.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'Password123!',
      });
    });
  });

  describe('refresh', () => {
    it('should rotate refresh token and issue new token pair', async () => {
      mockAuthService.refreshTokens.mockResolvedValue(mockAuthResponse);

      const result = await controller.refresh({
        refreshToken: 'valid-refresh-token',
      });

      expect(result).toEqual(mockAuthResponse);
      expect(authService.refreshTokens).toHaveBeenCalledWith({
        refreshToken: 'valid-refresh-token',
      });
    });
  });

  describe('logout', () => {
    it('should log out user and invalidate refresh token', async () => {
      mockAuthService.logout.mockResolvedValue({
        success: true,
        message: 'Logged out successfully',
      });

      const result = await controller.logout('user-uuid-1', {
        refreshToken: 'valid-refresh-token',
      });

      expect(result.success).toBe(true);
      expect(authService.logout).toHaveBeenCalledWith(
        'user-uuid-1',
        'valid-refresh-token',
      );
    });
  });
});
