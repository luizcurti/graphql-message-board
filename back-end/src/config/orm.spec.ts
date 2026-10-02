import * as path from 'path';

function loadOptions(nodeEnv: string | undefined) {
  const original = process.env.NODE_ENV;
  process.env.NODE_ENV = nodeEnv;
  let options: any;
  jest.isolateModules(() => {
    options = jest.requireActual('./orm').default;
  });
  process.env.NODE_ENV = original;
  return options;
}

describe('ORM options', () => {
  it('uses an in-memory, synchronized DB in tests', () => {
    const options = loadOptions('test');

    expect(options).toMatchObject({
      type: 'sqlite',
      database: ':memory:',
      logging: false,
      migrations: [],
      migrationsRun: false,
      synchronize: true,
    });
  });

  it('uses the file DB and runs migrations otherwise', () => {
    const options = loadOptions('production');

    expect(options).toMatchObject({
      database: 'data/chatterbox.db',
      logging: true,
      migrationsRun: true,
      synchronize: false,
    });
    expect(options.migrations).toEqual([
      path.resolve(__dirname, '..', 'db', 'migrations', '*'),
    ]);
  });
});
