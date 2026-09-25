import { PrismaClient, RoleName, ProviderType, PlanType, SubscriptionStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Seed Roles
  console.log('1. Seeding Roles (ADMIN, USER)...');
  const adminRole = await prisma.role.upsert({
    where: { name: RoleName.ADMIN },
    update: {},
    create: {
      name: RoleName.ADMIN,
      description: 'System Administrator with full access to management and analytics APIs',
    },
  });

  const userRole = await prisma.role.upsert({
    where: { name: RoleName.USER },
    update: {},
    create: {
      name: RoleName.USER,
      description: 'Standard end-user for Chrome Extension chat and web search',
    },
  });

  // 2. Seed Default AI Providers
  console.log('2. Seeding AI Providers (OpenAI, Claude, Gemini)...');
  await prisma.aiProvider.upsert({
    where: { name: ProviderType.GEMINI },
    update: {
      displayName: 'Google Gemini (Free Tier Default)',
      defaultModel: 'gemini-1.5-flash',
      availableModels: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash'],
      isDefault: true,
      isEnabled: true,
    },
    create: {
      name: ProviderType.GEMINI,
      displayName: 'Google Gemini (Free Tier Default)',
      baseUrl: 'https://generativelanguage.googleapis.com',
      defaultModel: 'gemini-1.5-flash',
      availableModels: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash'],
      isDefault: true,
      isEnabled: true,
    },
  });

  await prisma.aiProvider.upsert({
    where: { name: ProviderType.OPENAI },
    update: {
      displayName: 'OpenAI GPT Models',
      defaultModel: 'gpt-4o',
      availableModels: ['gpt-4o', 'gpt-4o-mini', 'o1', 'o3-mini'],
      isDefault: false,
      isEnabled: true,
    },
    create: {
      name: ProviderType.OPENAI,
      displayName: 'OpenAI GPT Models',
      baseUrl: 'https://api.openai.com/v1',
      defaultModel: 'gpt-4o',
      availableModels: ['gpt-4o', 'gpt-4o-mini', 'o1', 'o3-mini'],
      isDefault: false,
      isEnabled: true,
    },
  });

  await prisma.aiProvider.upsert({
    where: { name: ProviderType.CLAUDE },
    update: {
      displayName: 'Anthropic Claude Models',
      defaultModel: 'claude-3-5-sonnet-20241022',
      availableModels: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
      isDefault: false,
      isEnabled: true,
    },
    create: {
      name: ProviderType.CLAUDE,
      displayName: 'Anthropic Claude Models',
      baseUrl: 'https://api.anthropic.com/v1',
      defaultModel: 'claude-3-5-sonnet-20241022',
      availableModels: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
      isDefault: false,
      isEnabled: true,
    },
  });

  // 3. Seed Default Admin & Demo User
  console.log('3. Seeding Default Admin and User accounts...');
  const saltRounds = 10;
  const adminPasswordHash = await bcrypt.hash('Admin123!', saltRounds);
  const userPasswordHash = await bcrypt.hash('User123!', saltRounds);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@echogpt.app' },
    update: {},
    create: {
      email: 'admin@echogpt.app',
      passwordHash: adminPasswordHash,
      firstName: 'EchoGPT',
      lastName: 'Administrator',
      roleId: adminRole.id,
      isActive: true,
      isVerified: true,
      subscription: {
        create: {
          planType: PlanType.PREMIUM,
          status: SubscriptionStatus.ACTIVE,
          maxRequestsPerDay: 10000,
          usedRequestsToday: 0,
        },
      },
    },
  });

  const standardUser = await prisma.user.upsert({
    where: { email: 'user@echogpt.app' },
    update: {},
    create: {
      email: 'user@echogpt.app',
      passwordHash: userPasswordHash,
      firstName: 'Demo',
      lastName: 'User',
      roleId: userRole.id,
      isActive: true,
      isVerified: true,
      subscription: {
        create: {
          planType: PlanType.FREE,
          status: SubscriptionStatus.ACTIVE,
          maxRequestsPerDay: 20,
          usedRequestsToday: 0,
        },
      },
    },
  });

  console.log('✅ Seed completed successfully!');
  console.log(`- Admin account: ${adminUser.email} (Password: Admin123!)`);
  console.log(`- Demo user account: ${standardUser.email} (Password: User123!)`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
