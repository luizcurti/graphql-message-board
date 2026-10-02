import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module';
import UserService from './services/user.service';

describe('AppModule', () => {
  it('boots with an in-memory DB and wires services', async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const app = module.createNestApplication();
    await app.init();

    expect(module.get(DataSource).options.database).toBe(':memory:');
    expect(module.get(UserService)).toBeInstanceOf(UserService);

    await app.close();
  });
});
