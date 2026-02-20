import { DataSource } from 'typeorm';
import * as DataLoader from 'dataloader';
import UserLoader from './UserLoader';
import User from '../models/user.entity';

export type GQLContext = {
  UserLoader: DataLoader<number, User>;
};

export const createContext =
  (dataSource: DataSource) => (): GQLContext => ({
    UserLoader: UserLoader(dataSource)(),
  });
