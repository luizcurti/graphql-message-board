import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
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
      const result = await appController.getStats();
      expect(result).toBe('There are 0 existent messages');
    });
  });
});
