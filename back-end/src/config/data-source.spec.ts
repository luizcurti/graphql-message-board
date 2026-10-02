import { DataSource } from 'typeorm';
import dataSource from './data-source';

describe('CLI DataSource', () => {
  it('points to the file DB with migrations and no synchronize', () => {
    expect(dataSource).toBeInstanceOf(DataSource);
    expect(dataSource.options).toMatchObject({
      type: 'sqlite',
      database: 'data/chatterbox.db',
      synchronize: false,
    });
    expect(dataSource.options.migrations).toHaveLength(1);
  });
});
