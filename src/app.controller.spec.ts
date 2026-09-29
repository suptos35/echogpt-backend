import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return API overview metadata', () => {
      const result = appController.getRoot();
      expect(result).toHaveProperty('name', 'EchoGPT Backend REST API');
      expect(result).toHaveProperty('version');
      expect(result).toHaveProperty('documentation', '/api/docs');
      expect(result).toHaveProperty('modules');
      expect(Array.isArray(result.modules)).toBe(true);
    });
  });
});
