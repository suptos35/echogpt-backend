import { Test, TestingModule } from '@nestjs/testing';
import { ProvidersController } from './providers.controller';
import { ProvidersService } from './providers.service';
import { ProviderType } from '@prisma/client';

describe('ProvidersController', () => {
  let controller: ProvidersController;
  let providersService: any;

  const mockProvider = {
    id: 'prov-1',
    name: ProviderType.GEMINI,
    displayName: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com',
    isEnabled: true,
    isDefault: true,
    defaultModel: 'gemini-1.5-flash',
    availableModels: ['gemini-1.5-flash'],
    hasApiKey: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockProvidersService = {
    listProviders: jest.fn(),
    getProviderById: jest.fn(),
    createProvider: jest.fn(),
    updateProvider: jest.fn(),
    setDefaultProvider: jest.fn(),
    checkProviderHealth: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProvidersController],
      providers: [
        {
          provide: ProvidersService,
          useValue: mockProvidersService,
        },
      ],
    }).compile();

    controller = module.get<ProvidersController>(ProvidersController);
    providersService = module.get(ProvidersService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('list', () => {
    it('should list all providers', async () => {
      mockProvidersService.listProviders.mockResolvedValue([mockProvider]);

      const result = await controller.list();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe(ProviderType.GEMINI);
      expect(providersService.listProviders).toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('should get provider by ID', async () => {
      mockProvidersService.getProviderById.mockResolvedValue(mockProvider);

      const result = await controller.getById('prov-1');

      expect(result.id).toBe('prov-1');
      expect(providersService.getProviderById).toHaveBeenCalledWith('prov-1');
    });
  });

  describe('create', () => {
    it('should create a new provider', async () => {
      mockProvidersService.createProvider.mockResolvedValue(mockProvider);

      const dto = {
        name: ProviderType.GEMINI,
        displayName: 'Google Gemini',
        defaultModel: 'gemini-1.5-flash',
        availableModels: ['gemini-1.5-flash'],
      };

      const result = await controller.create(dto);

      expect(result).toEqual(mockProvider);
      expect(providersService.createProvider).toHaveBeenCalledWith(dto);
    });
  });

  describe('update', () => {
    it('should update an existing provider', async () => {
      const updated = { ...mockProvider, displayName: 'Updated Gemini' };
      mockProvidersService.updateProvider.mockResolvedValue(updated);

      const result = await controller.update('prov-1', {
        displayName: 'Updated Gemini',
      });

      expect(result.displayName).toBe('Updated Gemini');
      expect(providersService.updateProvider).toHaveBeenCalledWith('prov-1', {
        displayName: 'Updated Gemini',
      });
    });
  });

  describe('setDefault', () => {
    it('should set default provider', async () => {
      mockProvidersService.setDefaultProvider.mockResolvedValue(mockProvider);

      const result = await controller.setDefault('prov-1');

      expect(result.isDefault).toBe(true);
      expect(providersService.setDefaultProvider).toHaveBeenCalledWith(
        'prov-1',
      );
    });
  });

  describe('health', () => {
    it('should check provider health', async () => {
      mockProvidersService.checkProviderHealth.mockResolvedValue({
        id: 'prov-1',
        name: ProviderType.GEMINI,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        message: 'Mock health check passed',
      });

      const result = await controller.checkHealth('prov-1');

      expect(result.status).toBe('healthy');
      expect(providersService.checkProviderHealth).toHaveBeenCalledWith(
        'prov-1',
      );
    });
  });
});
