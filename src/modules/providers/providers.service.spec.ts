import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ProviderType } from '@prisma/client';
import { ProvidersService } from './providers.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CryptoService } from '../../common/crypto/crypto.service';

describe('ProvidersService (Unit Tests)', () => {
  let service: ProvidersService;
  let prisma: any;
  let cryptoService: any;

  const mockProvider = {
    id: 'prov-1',
    name: ProviderType.GEMINI,
    displayName: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com',
    encryptedApiKey: 'iv123:cipher123',
    isEnabled: true,
    isDefault: true,
    defaultModel: 'gemini-1.5-flash',
    availableModels: ['gemini-1.5-flash', 'gemini-1.5-pro'],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      aiProvider: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prisma)),
    };

    cryptoService = {
      encrypt: jest.fn((val: string) => `enc:${val}`),
      decrypt: jest.fn((val: string) => val.replace('enc:', '')),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProvidersService,
        { provide: PrismaService, useValue: prisma },
        { provide: CryptoService, useValue: cryptoService },
      ],
    }).compile();

    service = module.get<ProvidersService>(ProvidersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('listProviders', () => {
    it('should return list of providers without leaking encryptedApiKey or raw key', async () => {
      prisma.aiProvider.findMany.mockResolvedValue([mockProvider]);

      const result = await service.listProviders();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('prov-1');
      expect(result[0].hasApiKey).toBe(true);
      expect((result[0] as any).encryptedApiKey).toBeUndefined();
      expect((result[0] as any).apiKey).toBeUndefined();
    });
  });

  describe('getProviderById', () => {
    it('should return single provider by id without leaking key', async () => {
      prisma.aiProvider.findUnique.mockResolvedValue(mockProvider);

      const result = await service.getProviderById('prov-1');

      expect(result.id).toBe('prov-1');
      expect(result.hasApiKey).toBe(true);
      expect((result as any).encryptedApiKey).toBeUndefined();
    });

    it('should throw NotFoundException if provider does not exist', async () => {
      prisma.aiProvider.findUnique.mockResolvedValue(null);

      await expect(service.getProviderById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createProvider', () => {
    it('should encrypt apiKey and save provider', async () => {
      const dto = {
        name: ProviderType.OPENAI,
        displayName: 'OpenAI GPT',
        defaultModel: 'gpt-4o',
        availableModels: ['gpt-4o', 'gpt-4o-mini'],
        apiKey: 'sk-test-openai-key',
        isDefault: false,
        isEnabled: true,
      };

      prisma.aiProvider.findUnique.mockResolvedValue(null);
      prisma.aiProvider.create.mockResolvedValue({
        id: 'prov-2',
        ...dto,
        encryptedApiKey: 'enc:sk-test-openai-key',
      });

      const result = await service.createProvider(dto);

      expect(cryptoService.encrypt).toHaveBeenCalledWith('sk-test-openai-key');
      expect(result.hasApiKey).toBe(true);
      expect((result as any).encryptedApiKey).toBeUndefined();
    });
  });

  describe('setDefaultProvider', () => {
    it('should set selected provider as default and unset other providers', async () => {
      prisma.aiProvider.findUnique.mockResolvedValue({
        ...mockProvider,
        id: 'prov-2',
        isDefault: false,
      });

      prisma.aiProvider.update.mockResolvedValue({
        ...mockProvider,
        id: 'prov-2',
        isDefault: true,
      });

      const result = await service.setDefaultProvider('prov-2');

      expect(prisma.aiProvider.updateMany).toHaveBeenCalledWith({
        where: { id: { not: 'prov-2' } },
        data: { isDefault: false },
      });
      expect(result.isDefault).toBe(true);
    });

    it('should throw BadRequestException if trying to set disabled provider as default', async () => {
      prisma.aiProvider.findUnique.mockResolvedValue({
        ...mockProvider,
        id: 'prov-disabled',
        isEnabled: false,
      });

      await expect(service.setDefaultProvider('prov-disabled')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('checkProviderHealth', () => {
    it('should return healthy status for enabled provider with api key in mock test mode', async () => {
      prisma.aiProvider.findUnique.mockResolvedValue(mockProvider);

      const health = await service.checkProviderHealth('prov-1');

      expect(health.status).toBe('healthy');
      expect(health.provider).toBe(ProviderType.GEMINI);
      expect(health).toHaveProperty('latencyMs');
    });

    it('should return degraded/unhealthy status if provider is disabled', async () => {
      prisma.aiProvider.findUnique.mockResolvedValue({
        ...mockProvider,
        isEnabled: false,
      });

      const health = await service.checkProviderHealth('prov-1');

      expect(health.status).toBe('unhealthy');
      expect(health.message).toContain('disabled');
    });

    it('should return unhealthy status if provider key is invalid or corrupted', async () => {
      prisma.aiProvider.findUnique.mockResolvedValue({
        ...mockProvider,
        encryptedApiKey: 'invalid-key-ciphertext',
      });
      cryptoService.decrypt.mockReturnValue('invalid-key');

      const health = await service.checkProviderHealth('prov-1');

      expect(health.status).toBe('unhealthy');
      expect(health.message).toContain('invalid');
    });
  });

  describe('deleteProvider', () => {
    it('should delete a non-default provider successfully', async () => {
      prisma.aiProvider.findUnique.mockResolvedValue({
        ...mockProvider,
        id: 'prov-non-default',
        isDefault: false,
      });
      prisma.aiProvider.delete.mockResolvedValue({ id: 'prov-non-default' });

      const result = await service.deleteProvider('prov-non-default');

      expect(result.success).toBe(true);
      expect(prisma.aiProvider.delete).toHaveBeenCalledWith({
        where: { id: 'prov-non-default' },
      });
    });

    it('should throw BadRequestException when trying to delete default provider', async () => {
      prisma.aiProvider.findUnique.mockResolvedValue({
        ...mockProvider,
        id: 'prov-default',
        isDefault: true,
      });

      await expect(service.deleteProvider('prov-default')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when provider does not exist', async () => {
      prisma.aiProvider.findUnique.mockResolvedValue(null);

      await expect(service.deleteProvider('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
