import { DataSource } from 'typeorm';
import createUserLoader from './UserLoader';
import User from '../models/user.entity';

// UserLoader is the actual piece of code behind the README's "DataLoader —
// per-request batch loading (N+1 prevention)" claim, but nothing exercised
// it directly: the resolver spec only checks that `getUser` calls
// `UserLoader.load(id)`, with the loader itself mocked away. If the batch
// function here ever returned users out of order, or dropped a duplicate
// key, every message in a list would silently show the wrong author — these
// tests exercise the real DataLoader batching machinery instead of a mock.

function buildDataSource(seedUsers: User[]) {
  const findBy = jest.fn(async (where: { id: { value: number[] } }) => {
    const ids = where.id.value;
    return seedUsers.filter(user => ids.includes(user.id));
  });
  const getRepository = jest.fn().mockReturnValue({ findBy });
  return { dataSource: { getRepository } as unknown as DataSource, findBy };
}

describe('UserLoader', () => {
  const seedUsers = [
    { id: 1, email: 'a@test.com' },
    { id: 2, email: 'b@test.com' },
    { id: 3, email: 'c@test.com' },
  ] as User[];

  it('resolves each requested id to its matching user, preserving request order', async () => {
    const { dataSource } = buildDataSource(seedUsers);
    const loader = createUserLoader(dataSource)();

    const result = await loader.loadMany([3, 1, 2]);

    expect(result).toEqual([seedUsers[2], seedUsers[0], seedUsers[1]]);
  });

  it('batches concurrent loads for different ids into a single underlying query', async () => {
    const { dataSource, findBy } = buildDataSource(seedUsers);
    const loader = createUserLoader(dataSource)();

    await Promise.all([loader.load(1), loader.load(2), loader.load(3)]);

    expect(findBy).toHaveBeenCalledTimes(1);
    expect(findBy.mock.calls[0][0].id.value.sort()).toEqual([1, 2, 3]);
  });

  it('dedupes repeated requests for the same id within a batch', async () => {
    const { dataSource, findBy } = buildDataSource(seedUsers);
    const loader = createUserLoader(dataSource)();

    const [first, second] = await Promise.all([loader.load(1), loader.load(1)]);

    expect(first).toEqual(second);
    expect(findBy).toHaveBeenCalledTimes(1);
    expect(findBy.mock.calls[0][0].id.value).toEqual([1]);
  });

  it('resolves an id with no matching user to undefined, without breaking the other results', async () => {
    const { dataSource } = buildDataSource(seedUsers);
    const loader = createUserLoader(dataSource)();

    const result = await loader.loadMany([1, 999, 2]);

    expect(result[0]).toEqual(seedUsers[0]);
    expect(result[1]).toBeUndefined();
    expect(result[2]).toEqual(seedUsers[1]);
  });
});
