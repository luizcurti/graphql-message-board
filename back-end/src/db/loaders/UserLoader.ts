import DataLoader from 'dataloader';
import { DataSource, In } from 'typeorm';

import User from '../models/user.entity';

const batchUsers =
  (dataSource: DataSource) =>
  async (userIds: readonly number[]): Promise<User[]> => {
    const users = await dataSource
      .getRepository(User)
      .findBy({ id: In(userIds as number[]) });

    const userIdMap: { [userId: number]: User } = {};

    users.forEach(user => {
      userIdMap[user.id] = user;
    });

    return userIds.map(userId => userIdMap[userId]);
  };

export default (dataSource: DataSource) =>
  () =>
    new DataLoader<number, User>(batchUsers(dataSource));
