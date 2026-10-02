import { Query, Resolver } from '@nestjs/graphql';
import RepoService from '../repo.service';
import { Stats } from './types/stats.type';

@Resolver()
export default class StatsResolver {
  constructor(private readonly repoService: RepoService) {}

  @Query(() => Stats, { description: 'Returns total count of users and messages' })
  public async getStats(): Promise<Stats> {
    const [users, messages] = await Promise.all([
      this.repoService.userRepo.count(),
      this.repoService.messageRepo.count(),
    ]);
    return { users, messages };
  }
}
