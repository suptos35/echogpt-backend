import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { RoleName, PlanType, SubscriptionStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Register a new user account with default USER role and FREE subscription
   */
  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('An account with this email already exists');
    }

    const userRole = await this.prisma.role.findUnique({
      where: { name: RoleName.USER },
    });

    if (!userRole) {
      throw new InternalServerErrorException('Default user role not found in database');
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    const newUser = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        roleId: userRole.id,
        subscription: {
          create: {
            planType: PlanType.FREE,
            status: SubscriptionStatus.ACTIVE,
            maxRequestsPerDay: 20,
            usedRequestsToday: 0,
          },
        },
      },
      include: {
        role: true,
      },
    });

    return this.issueTokenFamily(newUser.id, newUser.email, newUser.role.name, newUser.firstName, newUser.lastName);
  }

  /**
   * Authenticate user credentials and issue fresh token family
   */
  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: { role: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account has been deactivated');
    }

    return this.issueTokenFamily(user.id, user.email, user.role.name, user.firstName, user.lastName);
  }

  /**
   * Rotate refresh token: invalidates used token and issues a new pair
   */
  async refreshTokens(dto: RefreshTokenDto): Promise<AuthResponseDto> {
    const refreshSecret = this.configService.get<string>('jwt.refreshSecret') || 'echogpt_super_secret_jwt_refresh_key_change_in_production';

    let payload: { sub: string; email: string; role: string };
    try {
      payload = await this.jwtService.verifyAsync(dto.refreshToken, {
        secret: refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const tokenHash = this.hashToken(dto.refreshToken);

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: { role: true },
        },
      },
    });

    if (!storedToken || storedToken.isRevoked || storedToken.expiresAt < new Date()) {
      // Security measure: if a revoked/replayed token is used, invalidate all user sessions
      if (storedToken && storedToken.isRevoked) {
        this.logger.warn(`Security alert: Replayed revoked refresh token detected for user ${storedToken.userId}. Revoking token family.`);
        await this.prisma.refreshToken.deleteMany({
          where: { userId: storedToken.userId },
        });
      }
      throw new UnauthorizedException('Invalid, revoked, or expired refresh token');
    }

    // Invalidate the current used refresh token (Rotation)
    await this.prisma.refreshToken.delete({
      where: { id: storedToken.id },
    });

    const user = storedToken.user;
    if (!user.isActive) {
      throw new UnauthorizedException('User account has been deactivated');
    }

    return this.issueTokenFamily(user.id, user.email, user.role.name, user.firstName, user.lastName);
  }

  /**
   * Log out user: removes the specific refresh token or clears all active sessions
   */
  async logout(userId: string, refreshToken?: string): Promise<{ success: boolean; message: string }> {
    if (refreshToken) {
      const tokenHash = this.hashToken(refreshToken);
      await this.prisma.refreshToken.deleteMany({
        where: { tokenHash, userId },
      });
    } else {
      await this.prisma.refreshToken.deleteMany({
        where: { userId },
      });
    }

    return {
      success: true,
      message: 'Successfully logged out',
    };
  }

  /**
   * Helper: Generate access and refresh tokens, hash and store the refresh token
   */
  private async issueTokenFamily(
    userId: string,
    email: string,
    role: string,
    firstName?: string | null,
    lastName?: string | null,
  ): Promise<AuthResponseDto> {
    const accessSecret = this.configService.get<string>('jwt.secret') || 'echogpt_super_secret_jwt_access_key_change_in_production';
    const accessExpiresIn = this.configService.get<string>('jwt.expiresIn') || '15m';
    const refreshSecret = this.configService.get<string>('jwt.refreshSecret') || 'echogpt_super_secret_jwt_refresh_key_change_in_production';
    const refreshExpiresIn = this.configService.get<string>('jwt.refreshExpiresIn') || '7d';

    const accessPayload = { sub: userId, email, role };
    const refreshPayload = { sub: userId, email, role, jti: crypto.randomUUID() };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: accessSecret,
        expiresIn: accessExpiresIn,
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: refreshSecret,
        expiresIn: refreshExpiresIn,
      }),
    ]);

    // Compute expiration date for refresh token (7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Store hashed refresh token in database
    const tokenHash = this.hashToken(refreshToken);
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: userId,
        email,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        role,
      },
    };
  }

  /**
   * Deterministic SHA-256 hashing for fast token lookup and secure storage
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
