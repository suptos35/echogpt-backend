import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let jwtService: any;
  let configService: any;

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      role: {
        findUnique: jest.fn(),
      },
      refreshToken: {
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    jwtService = {
      signAsync: jest.fn().mockImplementation((payload) => Promise.resolve(`signed_token_${payload.sub}`)),
      verifyAsync: jest.fn(),
    };

    configService = {
      get: jest.fn().mockImplementation((key) => {
        if (key === 'jwt.secret') return 'test_jwt_secret';
        if (key === 'jwt.refreshSecret') return 'test_refresh_secret';
        if (key === 'jwt.expiresIn') return '15m';
        if (key === 'jwt.refreshExpiresIn') return '7d';
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should throw ConflictException if user email already exists', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: '1', email: 'existing@echogpt.app' });

      await expect(
        service.register({
          email: 'existing@echogpt.app',
          password: 'Password123!',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should successfully register a new user with hashed password and issue tokens', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.role.findUnique.mockResolvedValue({ id: 'role-user-id', name: RoleName.USER });
      prisma.user.create.mockResolvedValue({
        id: 'new-user-id',
        email: 'new@echogpt.app',
        firstName: 'John',
        lastName: 'Doe',
        role: { name: 'USER' },
      });
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.register({
        email: 'new@echogpt.app',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user).toEqual({
        id: 'new-user-id',
        email: 'new@echogpt.app',
        firstName: 'John',
        lastName: 'Doe',
        role: 'USER',
      });
      expect(prisma.refreshToken.create).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedException if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nonexistent@echogpt.app', password: 'Password123!' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password does not match', async () => {
      const hashedPassword = await bcrypt.hash('CorrectPassword123!', 10);
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'user@echogpt.app',
        passwordHash: hashedPassword,
        isActive: true,
        role: { name: 'USER' },
      });

      await expect(
        service.login({ email: 'user@echogpt.app', password: 'WrongPassword!' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should successfully authenticate and return tokens for valid credentials', async () => {
      const hashedPassword = await bcrypt.hash('CorrectPassword123!', 10);
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'user@echogpt.app',
        passwordHash: hashedPassword,
        isActive: true,
        role: { name: 'USER' },
      });
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.login({ email: 'user@echogpt.app', password: 'CorrectPassword123!' });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe('user@echogpt.app');
    });
  });

  describe('logout', () => {
    it('should delete user refresh tokens and return success', async () => {
      prisma.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.logout('user-1');
      expect(result).toEqual({ success: true, message: 'Successfully logged out' });
      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
    });
  });
});
