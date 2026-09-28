import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = app.get(Logger);
  app.useLogger(logger);

  // Global exception filter for structured error logging & uniform error format
  app.useGlobalFilters(new AllExceptionsFilter());

  // Enable graceful shutdown
  app.enableShutdownHooks();

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // CORS configuration for Chrome extension & web clients
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Swagger OpenAPI documentation setup
  const config = new DocumentBuilder()
    .setTitle('EchoGPT Backend REST API')
    .setDescription(
      'Production-ready backend for EchoGPT Chrome Extension. Features multi-AI provider orchestration (OpenAI, Claude, Gemini), encrypted key management, subscription tiers, chat streaming, web search, and administrative controls.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter your JWT access token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('System & Health', 'Health check and system diagnostics')
    .addTag('Authentication', 'User registration, login, logout, and token rotation')
    .addTag('User Management', 'User profile, password change, account deletion, roles')
    .addTag('Subscription Management', 'Free & Premium tiers, quotas, remaining requests')
    .addTag('AI Providers', 'Manage OpenAI, Anthropic, Gemini credentials and defaults')
    .addTag('Chat API', 'Multi-model chat completion and conversation history')
    .addTag('Web Search', 'AI-assisted web search and history')
    .addTag('Admin Panel', 'Administrative statistics, logs, and system analytics')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port') || 3000;

  await app.listen(port);
  logger.log(`🚀 EchoGPT backend running on http://localhost:${port}`);
  logger.log(`📖 Swagger API documentation available at http://localhost:${port}/api/docs`);
}

bootstrap();
