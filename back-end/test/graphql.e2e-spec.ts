import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

const gql = '/graphql';

describe('GraphQL API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // ─────────────────────────────────────────────────────────
  // STATS QUERY
  // ─────────────────────────────────────────────────────────

  describe('Stats', () => {
    it('getStats — deve retornar contagem de usuários e mensagens', async () => {
      const { body } = await request(app.getHttpServer())
        .post(gql)
        .send({ query: '{ getStats { users messages } }' })
        .expect(200);

      expect(body.errors).toBeUndefined();
      expect(typeof body.data.getStats.users).toBe('number');
      expect(typeof body.data.getStats.messages).toBe('number');
    });

    it('getStats — totais devem refletir criação e deleção de dados', async () => {
      const before = await request(app.getHttpServer())
        .post(gql)
        .send({ query: '{ getStats { users messages } }' });

      const usersBefore = before.body.data.getStats.users;
      const msgsBefore = before.body.data.getStats.messages;

      // Cria user e mensagem
      const { body: uBody } = await request(app.getHttpServer())
        .post(gql)
        .send({ query: 'mutation { createOrLoginUser(data: { email: "stats-test@example.com" }) { id } }' });
      const statsUserId = uBody.data.createOrLoginUser.id;

      const { body: mBody } = await request(app.getHttpServer())
        .post(gql)
        .send({ query: `mutation { createMessage(data: { content: "stats msg", userId: ${statsUserId} }) { id } }` });
      const statsMsgId = mBody.data.createMessage.id;

      const after = await request(app.getHttpServer())
        .post(gql)
        .send({ query: '{ getStats { users messages } }' });

      expect(after.body.data.getStats.users).toBeGreaterThan(usersBefore);
      expect(after.body.data.getStats.messages).toBeGreaterThan(msgsBefore);

      // Limpa
      await request(app.getHttpServer()).post(gql)
        .send({ query: `mutation { deleteMessage(data: { id: ${statsMsgId}, userId: ${statsUserId} }) { id } }` });
      await request(app.getHttpServer()).post(gql)
        .send({ query: `mutation { deleteUser(data: { id: ${statsUserId} }) { id } }` });

      const restored = await request(app.getHttpServer())
        .post(gql)
        .send({ query: '{ getStats { users messages } }' });

      expect(restored.body.data.getStats.users).toBe(usersBefore);
      expect(restored.body.data.getStats.messages).toBe(msgsBefore);
    });
  });

  // ─────────────────────────────────────────────────────────
  // USER QUERIES & MUTATIONS
  // ─────────────────────────────────────────────────────────

  describe('Users', () => {
    let createdUserId: number;

    it('createOrLoginUser — deve criar um novo usuário', async () => {
      const { body } = await request(app.getHttpServer())
        .post(gql)
        .send({
          query: `
            mutation {
              createOrLoginUser(data: { email: "test@example.com" }) {
                id
                email
              }
            }
          `,
        })
        .expect(200);

      expect(body.errors).toBeUndefined();
      expect(body.data.createOrLoginUser.email).toBe('test@example.com');
      expect(body.data.createOrLoginUser.id).toBeDefined();
      createdUserId = body.data.createOrLoginUser.id;
    });

    it('createOrLoginUser — deve retornar o mesmo usuário ao logar novamente (email duplicado)', async () => {
      const { body } = await request(app.getHttpServer())
        .post(gql)
        .send({
          query: `
            mutation {
              createOrLoginUser(data: { email: "test@example.com" }) {
                id
                email
              }
            }
          `,
        })
        .expect(200);

      expect(body.errors).toBeUndefined();
      expect(body.data.createOrLoginUser.id).toBe(createdUserId);
    });

    it('createOrLoginUser — deve rejeitar email inválido', async () => {
      const { body } = await request(app.getHttpServer())
        .post(gql)
        .send({
          query: `
            mutation {
              createOrLoginUser(data: { email: "not-an-email" }) {
                id
                email
              }
            }
          `,
        })
        .expect(200);

      expect(body.errors).toBeDefined();
    });

    it('getUsers — deve retornar lista paginada de usuários', async () => {
      const { body } = await request(app.getHttpServer())
        .post(gql)
        .send({
          query: `
            query {
              getUsers(page: 1, limit: 10) {
                total
                page
                pages
                items {
                  id
                  email
                }
              }
            }
          `,
        })
        .expect(200);

      expect(body.errors).toBeUndefined();
      expect(body.data.getUsers.total).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(body.data.getUsers.items)).toBe(true);
    });

    it('getUsers — deve respeitar o limit e retornar apenas 1 item por página', async () => {
      const { body } = await request(app.getHttpServer())
        .post(gql)
        .send({ query: '{ getUsers(page: 1, limit: 1) { total page pages items { id } } }' })
        .expect(200);

      expect(body.errors).toBeUndefined();
      expect(body.data.getUsers.items.length).toBe(1);
      expect(body.data.getUsers.pages).toBeGreaterThanOrEqual(1);
    });

    it('getUsers — page 2 deve retornar itens diferentes da page 1', async () => {
      // Garante pelo menos 2 usuários (usa os criados pelos outros testes)
      const page1 = await request(app.getHttpServer())
        .post(gql)
        .send({ query: '{ getUsers(page: 1, limit: 1) { items { id } } }' });
      const page2 = await request(app.getHttpServer())
        .post(gql)
        .send({ query: '{ getUsers(page: 2, limit: 1) { items { id } } }' });

      const id1 = page1.body.data.getUsers.items[0]?.id;
      const id2 = page2.body.data.getUsers.items[0]?.id;
      // Se existem pelo menos 2 usuários, devem ser diferentes
      if (id2 !== undefined) {
        expect(id1).not.toBe(id2);
      }
    });

    it('getUser — deve retornar usuário pelo id', async () => {
      const { body } = await request(app.getHttpServer())
        .post(gql)
        .send({
          query: `
            query {
              getUser(id: ${createdUserId}) {
                id
                email
              }
            }
          `,
        })
        .expect(200);

      expect(body.errors).toBeUndefined();
      expect(body.data.getUser.id).toBe(createdUserId);
      expect(body.data.getUser.email).toBe('test@example.com');
    });

    it('getUser — deve retornar null para id inexistente', async () => {
      const { body } = await request(app.getHttpServer())
        .post(gql)
        .send({
          query: `
            query {
              getUser(id: 99999) {
                id
                email
              }
            }
          `,
        })
        .expect(200);

      expect(body.errors).toBeUndefined();
      expect(body.data.getUser).toBeNull();
    });

    it('updateUser — deve atualizar o email do usuário', async () => {
      const { body } = await request(app.getHttpServer())
        .post(gql)
        .send({
          query: `
            mutation {
              updateUser(data: { id: ${createdUserId}, email: "updated@example.com" }) {
                id
                email
              }
            }
          `,
        })
        .expect(200);

      expect(body.errors).toBeUndefined();
      expect(body.data.updateUser.email).toBe('updated@example.com');
    });

    it('updateUser — deve retornar erro para usuário inexistente', async () => {
      const { body } = await request(app.getHttpServer())
        .post(gql)
        .send({
          query: `
            mutation {
              updateUser(data: { id: 99999, email: "x@example.com" }) {
                id
              }
            }
          `,
        })
        .expect(200);

      expect(body.errors).toBeDefined();
      expect(body.errors[0].message).toBe('User not found');
    });

    it('updateUser — deve rejeitar email já utilizado por outro usuário', async () => {
      // Criar segundo usuário
      await request(app.getHttpServer())
        .post(gql)
        .send({
          query: `mutation { createOrLoginUser(data: { email: "second@example.com" }) { id } }`,
        });

      const { body } = await request(app.getHttpServer())
        .post(gql)
        .send({
          query: `
            mutation {
              updateUser(data: { id: ${createdUserId}, email: "second@example.com" }) {
                id
              }
            }
          `,
        })
        .expect(200);

      expect(body.errors).toBeDefined();
      expect(body.errors[0].message).toContain('already in use');
    });

    it('deleteUser — deve deletar o usuário', async () => {
      const { body } = await request(app.getHttpServer())
        .post(gql)
        .send({
          query: `
            mutation {
              deleteUser(data: { id: ${createdUserId} }) {
                id
                email
              }
            }
          `,
        })
        .expect(200);

      expect(body.errors).toBeUndefined();
      expect(body.data.deleteUser.id).toBe(createdUserId);
    });

    it('deleteUser — deve retornar erro para usuário inexistente', async () => {
      const { body } = await request(app.getHttpServer())
        .post(gql)
        .send({
          query: `
            mutation {
              deleteUser(data: { id: 99999 }) {
                id
              }
            }
          `,
        })
        .expect(200);

      expect(body.errors).toBeDefined();
      expect(body.errors[0].message).toBe('User not found');
    });
  });

  // ─────────────────────────────────────────────────────────
  // MESSAGE QUERIES & MUTATIONS
  // ─────────────────────────────────────────────────────────

  describe('Messages', () => {
    let userId: number;
    let messageId: number;

    beforeAll(async () => {
      // Cria um usuário para as mensagens
      const { body } = await request(app.getHttpServer())
        .post(gql)
        .send({
          query: `mutation { createOrLoginUser(data: { email: "msguser@example.com" }) { id } }`,
        });
      userId = body.data.createOrLoginUser.id;
    });

    it('createMessage — deve criar uma mensagem', async () => {
      const { body } = await request(app.getHttpServer())
        .post(gql)
        .send({
          query: `
            mutation {
              createMessage(data: { content: "Olá mundo!", userId: ${userId} }) {
                id
                content
                userId
              }
            }
          `,
        })
        .expect(200);

      expect(body.errors).toBeUndefined();
      expect(body.data.createMessage.content).toBe('Olá mundo!');
      expect(body.data.createMessage.userId).toBe(userId);
      messageId = body.data.createMessage.id;
    });

    it('createMessage — deve rejeitar conteúdo vazio', async () => {
      const { body } = await request(app.getHttpServer())
        .post(gql)
        .send({
          query: `
            mutation {
              createMessage(data: { content: "", userId: ${userId} }) {
                id
              }
            }
          `,
        })
        .expect(200);

      expect(body.errors).toBeDefined();
    });

    it('createMessage — deve rejeitar conteúdo com mais de 500 caracteres', async () => {
      const longContent = 'x'.repeat(501);
      const { body } = await request(app.getHttpServer())
        .post(gql)
        .send({
          query: `mutation { createMessage(data: { content: "${longContent}", userId: ${userId} }) { id } }`,
        })
        .expect(200);

      expect(body.errors).toBeDefined();
    });

    it('getMessages — deve retornar lista paginada de mensagens', async () => {
      const { body } = await request(app.getHttpServer())
        .post(gql)
        .send({
          query: `
            query {
              getMessages(page: 1, limit: 10) {
                total
                page
                pages
                items {
                  id
                  content
                  userId
                }
              }
            }
          `,
        })
        .expect(200);

      expect(body.errors).toBeUndefined();
      expect(body.data.getMessages.total).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(body.data.getMessages.items)).toBe(true);
    });

    it('getMessages — deve respeitar limit e retornar apenas 1 item por página', async () => {
      const { body } = await request(app.getHttpServer())
        .post(gql)
        .send({ query: '{ getMessages(page: 1, limit: 1) { total page pages items { id } } }' })
        .expect(200);

      expect(body.errors).toBeUndefined();
      expect(body.data.getMessages.items.length).toBe(1);
    });

    it('getMessagesFromUser — deve retornar mensagens de um usuário específico', async () => {
      const { body } = await request(app.getHttpServer())
        .post(gql)
        .send({
          query: `
            query {
              getMessagesFromUser(userId: ${userId}, page: 1, limit: 10) {
                total
                items {
                  id
                  content
                  userId
                }
              }
            }
          `,
        })
        .expect(200);

      expect(body.errors).toBeUndefined();
      expect(body.data.getMessagesFromUser.total).toBeGreaterThanOrEqual(1);
      body.data.getMessagesFromUser.items.forEach((msg: any) => {
        expect(msg.userId).toBe(userId);
      });
    });

    it('getMessagesFromUser — deve retornar lista vazia para userId sem mensagens', async () => {
      const { body } = await request(app.getHttpServer())
        .post(gql)
        .send({
          query: `
            query {
              getMessagesFromUser(userId: 99999, page: 1, limit: 10) {
                total
                items { id }
              }
            }
          `,
        })
        .expect(200);

      expect(body.errors).toBeUndefined();
      expect(body.data.getMessagesFromUser.total).toBe(0);
      expect(body.data.getMessagesFromUser.items).toHaveLength(0);
    });

    it('getMessagesFromUser — deve respeitar limit e paginar corretamente', async () => {
      // Cria 3 mensagens adicionais para garantir paginação
      await request(app.getHttpServer()).post(gql)
        .send({ query: `mutation { createMessage(data: { content: "msg pag 1", userId: ${userId} }) { id } }` });
      await request(app.getHttpServer()).post(gql)
        .send({ query: `mutation { createMessage(data: { content: "msg pag 2", userId: ${userId} }) { id } }` });

      const page1 = await request(app.getHttpServer())
        .post(gql)
        .send({ query: `{ getMessagesFromUser(userId: ${userId}, page: 1, limit: 1) { total pages items { id } } }` });

      expect(page1.body.errors).toBeUndefined();
      expect(page1.body.data.getMessagesFromUser.items).toHaveLength(1);
      expect(page1.body.data.getMessagesFromUser.pages).toBeGreaterThan(1);
    });

    it('getMessage — deve retornar mensagem pelo id', async () => {
      const { body } = await request(app.getHttpServer())
        .post(gql)
        .send({
          query: `
            query {
              getMessage(id: ${messageId}) {
                id
                content
                userId
              }
            }
          `,
        })
        .expect(200);

      expect(body.errors).toBeUndefined();
      expect(body.data.getMessage.id).toBe(messageId);
      expect(body.data.getMessage.content).toBe('Olá mundo!');
    });

    it('getMessage — deve retornar null para id inexistente', async () => {
      const { body } = await request(app.getHttpServer())
        .post(gql)
        .send({
          query: `
            query {
              getMessage(id: 99999) {
                id
              }
            }
          `,
        })
        .expect(200);

      expect(body.errors).toBeUndefined();
      expect(body.data.getMessage).toBeNull();
    });

    it('updateMessage — deve atualizar o conteúdo da mensagem', async () => {
      const { body } = await request(app.getHttpServer())
        .post(gql)
        .send({
          query: `
            mutation {
              updateMessage(data: { id: ${messageId}, userId: ${userId}, content: "Mensagem atualizada" }) {
                id
                content
              }
            }
          `,
        })
        .expect(200);

      expect(body.errors).toBeUndefined();
      expect(body.data.updateMessage.content).toBe('Mensagem atualizada');
    });

    it('updateMessage — deve retornar erro para mensagem inexistente', async () => {
      const { body } = await request(app.getHttpServer())
        .post(gql)
        .send({
          query: `
            mutation {
              updateMessage(data: { id: 99999, userId: ${userId}, content: "X" }) {
                id
              }
            }
          `,
        })
        .expect(200);

      expect(body.errors).toBeDefined();
      expect(body.errors[0].message).toBe('Message not found');
    });

    it('updateMessage — deve retornar erro ao editar mensagem de outro usuário', async () => {
      const { body } = await request(app.getHttpServer())
        .post(gql)
        .send({
          query: `
            mutation {
              updateMessage(data: { id: ${messageId}, userId: 99999, content: "Hacked" }) {
                id
              }
            }
          `,
        })
        .expect(200);

      expect(body.errors).toBeDefined();
      expect(body.errors[0].message).toContain('not the author');
    });

    it('deleteMessage — deve retornar erro ao deletar mensagem de outro usuário', async () => {
      const { body } = await request(app.getHttpServer())
        .post(gql)
        .send({
          query: `
            mutation {
              deleteMessage(data: { id: ${messageId}, userId: 99999 }) {
                id
              }
            }
          `,
        })
        .expect(200);

      expect(body.errors).toBeDefined();
    });

    it('deleteMessage — deve deletar a mensagem', async () => {
      const { body } = await request(app.getHttpServer())
        .post(gql)
        .send({
          query: `
            mutation {
              deleteMessage(data: { id: ${messageId}, userId: ${userId} }) {
                id
                content
              }
            }
          `,
        })
        .expect(200);

      expect(body.errors).toBeUndefined();
      expect(body.data.deleteMessage.id).toBe(messageId);
    });

    it('getMessage — deve retornar null após deletar', async () => {
      const { body } = await request(app.getHttpServer())
        .post(gql)
        .send({
          query: `query { getMessage(id: ${messageId}) { id } }`,
        })
        .expect(200);

      expect(body.errors).toBeUndefined();
      expect(body.data.getMessage).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────
  // RESOLUÇÃO DE CAMPO (user dentro de message)
  // ─────────────────────────────────────────────────────────

  describe('ResolveField — Message.user', () => {
    let userId: number;

    beforeAll(async () => {
      const { body } = await request(app.getHttpServer())
        .post(gql)
        .send({
          query: `mutation { createOrLoginUser(data: { email: "fielduser@example.com" }) { id } }`,
        });
      userId = body.data.createOrLoginUser.id;
      await request(app.getHttpServer())
        .post(gql)
        .send({
          query: `mutation { createMessage(data: { content: "Test field", userId: ${userId} }) { id } }`,
        });
    });

    it('getMessages — deve resolver o campo user via DataLoader', async () => {
      const { body } = await request(app.getHttpServer())
        .post(gql)
        .send({
          query: `
            query {
              getMessages(page: 1, limit: 5) {
                items {
                  id
                  content
                  user {
                    id
                    email
                  }
                }
              }
            }
          `,
        })
        .expect(200);

      expect(body.errors).toBeUndefined();
      const items = body.data.getMessages.items;
      expect(items.length).toBeGreaterThan(0);
      items.forEach((msg: any) => {
        expect(msg.user).toBeDefined();
        expect(msg.user.id).toBeDefined();
        expect(msg.user.email).toBeDefined();
      });
    });
  });
});
