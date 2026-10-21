import { Repository } from 'typeorm';
import RepoService from './repo.service';
import User from './db/models/user.entity';
import Message from './db/models/message.entity';

describe('RepoService', () => {
  it('exposes the injected repositories', () => {
    const userRepo = {} as Repository<User>;
    const messageRepo = {} as Repository<Message>;

    const service = new RepoService(userRepo, messageRepo);

    expect(service.userRepo).toBe(userRepo);
    expect(service.messageRepo).toBe(messageRepo);
  });
});
