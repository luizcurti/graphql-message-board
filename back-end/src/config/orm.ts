import * as path from 'path';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

const isTest = process.env.NODE_ENV === 'test';

const options: TypeOrmModuleOptions = {
  type: 'sqlite',
  database: isTest ? ':memory:' : 'data/rocketseat.db',
  logging: !isTest,
  entities: [path.resolve(__dirname, '..', 'db', 'models', '*')],
  migrations: isTest ? [] : [path.resolve(__dirname, '..', 'db', 'migrations', '*')],
  synchronize: isTest,
};

export default options;
