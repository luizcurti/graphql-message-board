import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

describe('GraphQL Stats (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('query getStats — deve retornar contagem de usuários e mensagens', async () => {
    const { body } = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query: '{ getStats { users messages } }' })
      .expect(200);

    expect(body.errors).toBeUndefined();
    expect(typeof body.data.getStats.users).toBe('number');
    expect(typeof body.data.getStats.messages).toBe('number');
  });

  afterAll(async () => {
    await app.close();
  });
});

