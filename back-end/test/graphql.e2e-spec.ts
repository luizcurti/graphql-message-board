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
    it('getStats — returns the count of users and messages', async () => {
      const { body } = await request(app.getHttpServer())
        .post(gql)
        .send({ query: '{ getStats { users messages } }' })
        .expect(200);

      expect(body.errors).toBeUndefined();
      expect(typeof body.data.getStats.users).toBe('number');
      expect(typeof body.data.getStats.messages).toBe('number');
    });

    it('getStats — totals reflect data creation and deletion', async () => {
      const before = await request(app.getHttpServer())
        .post(gql)
        .send({ query: '{ getStats { users messages } }' });

      const usersBefore = before.body.data.getStats.users;
      const msgsBefore = before.body.data.getStats.messages;

      // Create a user and a message
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

      // Clean up
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

    it('createOrLoginUser — creates a new user', async () => {
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

    it('createOrLoginUser — returns the same user when logging in again (duplicate email)', async () => {
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

    it('createOrLoginUser — rejects an invalid email', async () => {
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

    it('getUsers — returns a paginated list of users', async () => {
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

    it('getUsers — respects the limit and returns only 1 item per page', async () => {
      const { body } = await request(app.getHttpServer())
        .post(gql)
        .send({ query: '{ getUsers(page: 1, limit: 1) { total page pages items { id } } }' })
        .expect(200);

      expect(body.errors).toBeUndefined();
      expect(body.data.getUsers.items.length).toBe(1);
      expect(body.data.getUsers.pages).toBeGreaterThanOrEqual(1);
    });

    it('getUsers — page 2 returns different items than page 1', async () => {
      // Relies on at least 2 users existing (created by the other tests)
      const page1 = await request(app.getHttpServer())
        .post(gql)
        .send({ query: '{ getUsers(page: 1, limit: 1) { items { id } } }' });
      const page2 = await request(app.getHttpServer())
        .post(gql)
        .send({ query: '{ getUsers(page: 2, limit: 1) { items { id } } }' });

      const id1 = page1.body.data.getUsers.items[0]?.id;
      const id2 = page2.body.data.getUsers.items[0]?.id;
      // If at least 2 users exist, they must differ
      if (id2 !== undefined) {
        expect(id1).not.toBe(id2);
      }
    });

    it('getUser — returns a user by id', async () => {
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

    it('getUser — returns null for a nonexistent id', async () => {
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

    it('updateUser — updates the user email', async () => {
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

    it('updateUser — returns an error for a nonexistent user', async () => {
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

    it('updateUser — rejects an email already used by another user', async () => {
      // Create a second user
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

    it('deleteUser — deletes the user', async () => {
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

    it('deleteUser — returns an error for a nonexistent user', async () => {
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
      // Create a user to own the messages
      const { body } = await request(app.getHttpServer())
        .post(gql)
        .send({
          query: `mutation { createOrLoginUser(data: { email: "msguser@example.com" }) { id } }`,
        });
      userId = body.data.createOrLoginUser.id;
    });

    it('createMessage — creates a message', async () => {
      const { body } = await request(app.getHttpServer())
        .post(gql)
        .send({
          query: `
            mutation {
              createMessage(data: { content: "Hello world!", userId: ${userId} }) {
                id
                content
                userId
              }
            }
          `,
        })
        .expect(200);

      expect(body.errors).toBeUndefined();
      expect(body.data.createMessage.content).toBe('Hello world!');
      expect(body.data.createMessage.userId).toBe(userId);
      messageId = body.data.createMessage.id;
    });

    it('createMessage — rejects empty content', async () => {
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

    it('createMessage — rejects content longer than 500 characters', async () => {
      const longContent = 'x'.repeat(501);
      const { body } = await request(app.getHttpServer())
        .post(gql)
        .send({
          query: `mutation { createMessage(data: { content: "${longContent}", userId: ${userId} }) { id } }`,
        })
        .expect(200);

      expect(body.errors).toBeDefined();
    });

    it('getMessages — returns a paginated list of messages', async () => {
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

    it('getMessages — respects the limit and returns only 1 item per page', async () => {
      const { body } = await request(app.getHttpServer())
        .post(gql)
        .send({ query: '{ getMessages(page: 1, limit: 1) { total page pages items { id } } }' })
        .expect(200);

      expect(body.errors).toBeUndefined();
      expect(body.data.getMessages.items.length).toBe(1);
    });

    it('getMessagesFromUser — returns messages for a specific user', async () => {
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

    it('getMessagesFromUser — returns an empty list for a userId with no messages', async () => {
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

    it('getMessagesFromUser — respects the limit and paginates correctly', async () => {
      // Create 3 additional messages to guarantee pagination
      await request(app.getHttpServer()).post(gql)
        .send({ query: `mutation { createMessage(data: { content: "page msg 1", userId: ${userId} }) { id } }` });
      await request(app.getHttpServer()).post(gql)
        .send({ query: `mutation { createMessage(data: { content: "page msg 2", userId: ${userId} }) { id } }` });

      const page1 = await request(app.getHttpServer())
        .post(gql)
        .send({ query: `{ getMessagesFromUser(userId: ${userId}, page: 1, limit: 1) { total pages items { id } } }` });

      expect(page1.body.errors).toBeUndefined();
      expect(page1.body.data.getMessagesFromUser.items).toHaveLength(1);
      expect(page1.body.data.getMessagesFromUser.pages).toBeGreaterThan(1);
    });

    it('getMessage — returns a message by id', async () => {
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
      expect(body.data.getMessage.content).toBe('Hello world!');
    });

    it('getMessage — returns null for a nonexistent id', async () => {
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

    it('updateMessage — updates the message content', async () => {
      const { body } = await request(app.getHttpServer())
        .post(gql)
        .send({
          query: `
            mutation {
              updateMessage(data: { id: ${messageId}, userId: ${userId}, content: "Updated message" }) {
                id
                content
              }
            }
          `,
        })
        .expect(200);

      expect(body.errors).toBeUndefined();
      expect(body.data.updateMessage.content).toBe('Updated message');
    });

    it('updateMessage — returns an error for a nonexistent message', async () => {
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

    it('updateMessage — returns an error when editing another user\'s message', async () => {
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

    it('deleteMessage — returns an error when deleting another user\'s message', async () => {
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

    it('deleteMessage — deletes the message', async () => {
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

    it('getMessage — returns null after deletion', async () => {
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
  // FIELD RESOLUTION (user within message)
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

    it('getMessages — resolves the user field via DataLoader', async () => {
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

  // ─────────────────────────────────────────────────────────
  // MALFORMED / INVALID REQUESTS
  // ─────────────────────────────────────────────────────────

  describe('Malformed requests', () => {
    it('returns a GraphQL error for a syntactically invalid query', async () => {
      const { body } = await request(app.getHttpServer())
        .post(gql)
        .send({ query: '{ getStats { users' })
        .expect(400);

      expect(body.errors).toBeDefined();
    });

    it('returns a GraphQL error for an unknown field', async () => {
      const { body } = await request(app.getHttpServer())
        .post(gql)
        .send({ query: '{ thisFieldDoesNotExist }' })
        .expect(400);

      expect(body.errors).toBeDefined();
    });
  });
});
