import { Test, TestingModule } from '@nestjs/testing';
import StatsResolver from './stats.resolver';
import RepoService from '../repo.service';

describe('StatsResolver', () => {
  let resolver: StatsResolver;

  const mockRepoService = {
    userRepo: {
      count: jest.fn(),
    },
    messageRepo: {
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatsResolver,
        { provide: RepoService, useValue: mockRepoService },
      ],
    }).compile();

    resolver = module.get<StatsResolver>(StatsResolver);
  });

  describe('getStats', () => {
    it('returns the count of users and messages', async () => {
      mockRepoService.userRepo.count.mockResolvedValue(3);
      mockRepoService.messageRepo.count.mockResolvedValue(7);

      const result = await resolver.getStats();

      expect(result).toEqual({ users: 3, messages: 7 });
    });

    it('returns zeros when there is no data', async () => {
      mockRepoService.userRepo.count.mockResolvedValue(0);
      mockRepoService.messageRepo.count.mockResolvedValue(0);

      const result = await resolver.getStats();

      expect(result).toEqual({ users: 0, messages: 0 });
    });
  });
});
