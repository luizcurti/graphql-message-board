import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import RepoService from './repo.service';

describe('AppController', () => {
  let appController: AppController;

  const mockRepoService = {
    messageRepo: {
      count: jest.fn().mockResolvedValue(0),
    },
  };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: RepoService,
          useValue: mockRepoService,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return message count', async () => {
      const result = await appController.getHello();
      expect(result).toBe('There are 0 existent messages');
    });
  });
});
