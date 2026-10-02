import DataLoader from 'dataloader';
import { DataSource } from 'typeorm';
import { createContext } from './index';

describe('createContext', () => {
  const dataSource = {} as DataSource;

  it('returns a context with a UserLoader', () => {
    const context = createContext(dataSource)();

    expect(context.UserLoader).toBeInstanceOf(DataLoader);
  });

  it('creates a fresh loader per request', () => {
    const factory = createContext(dataSource);

    expect(factory().UserLoader).not.toBe(factory().UserLoader);
  });
});
