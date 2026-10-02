import { DataSource } from 'typeorm';
import User from '../models/user.entity';
import Message from '../models/message.entity';
import { createUsers1585025619325 } from './1585025619325-create-users';
import { createMessages1585025829086 } from './1585025829086-create-messages';

describe('migrations', () => {
  let dataSource: DataSource;

  beforeEach(async () => {
    dataSource = new DataSource({
      type: 'sqlite',
      database: ':memory:',
      entities: [User, Message],
      migrations: [createUsers1585025619325, createMessages1585025829086],
    });
    await dataSource.initialize();
    await dataSource.runMigrations();
  });

  afterEach(() => dataSource.destroy());

  it('creates both tables with the messages → users foreign key', async () => {
    const runner = dataSource.createQueryRunner();
    const messages = await runner.getTable('messages');
    const users = await runner.getTable('users');
    await runner.release();

    expect(users?.findColumnByName('email')?.isUnique).toBe(true);
    expect(messages?.foreignKeys).toEqual([
      expect.objectContaining({
        columnNames: ['user_id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    ]);
  });

  it('cascades message deletion when a user is deleted', async () => {
    const user = await dataSource.getRepository(User).save({ email: 'a@b.com' });
    await dataSource.getRepository(Message).save({ userId: user.id, content: 'hi' });

    await dataSource.getRepository(User).delete(user.id);

    expect(await dataSource.getRepository(Message).count()).toBe(0);
  });

  it('rejects a message for a nonexistent user (sad)', async () => {
    await expect(
      dataSource.getRepository(Message).save({ userId: 999, content: 'hi' }),
    ).rejects.toThrow(/FOREIGN KEY/);
  });

  it('rejects a duplicate email (sad)', async () => {
    await dataSource.getRepository(User).save({ email: 'dup@b.com' });

    await expect(
      dataSource.getRepository(User).save({ email: 'dup@b.com' }),
    ).rejects.toThrow(/UNIQUE/);
  });

  it('reverts both migrations', async () => {
    await dataSource.undoLastMigration();
    await dataSource.undoLastMigration();

    const runner = dataSource.createQueryRunner();
    expect(await runner.hasTable('messages')).toBe(false);
    expect(await runner.hasTable('users')).toBe(false);
    await runner.release();
  });
});
