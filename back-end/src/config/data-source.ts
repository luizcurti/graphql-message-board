import * as path from 'path';
import { DataSource } from 'typeorm';

export default new DataSource({
  type: 'sqlite',
  database: 'data/rocketseat.db',
  logging: true,
  entities: [path.resolve(__dirname, '..', 'db', 'models', '*')],
  migrations: [path.resolve(__dirname, '..', 'db', 'migrations', '*')],
  synchronize: false,
});
