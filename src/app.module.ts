import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import * as crypto from 'crypto';
import configuration from './config/configuration';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './common/prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const env =
          config.get<string>('environment') ||
          process.env.NODE_ENV ||
          'development';
        const isProd = env === 'production';
        const isTest = env === 'test';

        return {
          pinoHttp: {
            level: isTest ? 'silent' : isProd ? 'info' : 'debug',
            genReqId: (req, res) => {
              const existingId = req.headers['x-request-id'];
              if (existingId && typeof existingId === 'string') return existingId;
              const id = crypto.randomUUID();
              res.setHeader('x-request-id', id);
              return id;
            },
            redact: {
              paths: [
                'req.headers.authorization',
                'req.headers.cookie',
                'req.body.password',
                'req.body.currentPassword',
                'req.body.newPassword',
                'req.body.refreshToken',
                'req.body.apiKey',
                'apiKey',
                'password',
                'refreshToken',
              ],
              censor: '[REDACTED]',
            },
            transport:
              !isProd && !isTest
                ? {
                    target: 'pino-pretty',
                    options: {
                      colorize: true,
                      singleLine: true,
                    },
                  }
                : undefined,
          },
        };
      },
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

