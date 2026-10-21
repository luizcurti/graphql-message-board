import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createClient, Client } from 'graphql-ws';
import WebSocket from 'ws';
import { AppModule } from './../src/app.module';
import { createValidationPipe } from './../src/common/validation';

describe('GraphQL API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(createValidationPipe());
    await app.listen(0);
  });

  afterAll(async () => {
    await app.close();
  });

  async function gql(query: string, variables?: Record<string, unknown>) {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query, variables });
    return { status: res.status, body: res.body };
  }

  async function ok(query: string, variables?: Record<string, unknown>) {
    const { status, body } = await gql(query, variables);
    expect(status).toBe(200);
    expect(body.errors).toBeUndefined();
    return body.data;
  }

  async function fails(query: string, code: string, message?: string | RegExp) {
    const { body } = await gql(query);
    expect(body.errors).toHaveLength(1);
    expect(body.errors[0].extensions.code).toBe(code);
    if (message) expect(body.errors[0].message).toMatch(message);
    return body;
  }

  async function createUser(email: string): Promise<number> {
    const data = await ok(
      `mutation { createOrLoginUser(data: { email: "${email}" }) { id } }`,
    );
    return data.createOrLoginUser.id;
  }

  async function createMessage(userId: number, content: string): Promise<number> {
    const data = await ok(
      `mutation { createMessage(data: { userId: ${userId}, content: "${content}" }) { id } }`,
    );
    return data.createMessage.id;
  }

  const getStats = async () =>
    (await ok('{ getStats { users messages } }')).getStats;

  // ─── Stats ──────────────────────────────────────────────────

  describe('getStats', () => {
    it('returns user and message counts', async () => {
      const stats = await getStats();
      expect(stats).toEqual({ users: expect.any(Number), messages: expect.any(Number) });
    });

    it('reflects creation and deletion', async () => {
      const before = await getStats();
      const userId = await createUser('stats@example.com');
      await createMessage(userId, 'stats');

      expect(await getStats()).toEqual({
        users: before.users + 1,
        messages: before.messages + 1,
      });

      await ok(`mutation { deleteUser(data: { id: ${userId} }) { id } }`);
      expect(await getStats()).toEqual(before);
    });

    it('rejects an unknown field (sad)', async () => {
      await fails('{ getStats { unknown } }', 'GRAPHQL_VALIDATION_FAILED');
    });
  });

  // ─── Users ──────────────────────────────────────────────────

  describe('createOrLoginUser', () => {
    it('creates a new user with every output field', async () => {
      const data = await ok(
        'mutation { createOrLoginUser(data: { email: "new@example.com" }) { id email createdAt updatedAt } }',
      );
      expect(data.createOrLoginUser).toEqual({
        id: expect.any(Number),
        email: 'new@example.com',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    });

    it('logs in an existing user (same id)', async () => {
      const first = await createUser('login@example.com');
      expect(await createUser('login@example.com')).toBe(first);
    });

    it('normalizes the email to lowercase', async () => {
      const id = await createUser('case@example.com');
      const data = await ok(
        'mutation { createOrLoginUser(data: { email: "CASE@Example.com" }) { id email } }',
      );
      expect(data.createOrLoginUser).toEqual({ id, email: 'case@example.com' });
    });

    it.each([
      ['an invalid email', '"not-an-email"', 'BAD_USER_INPUT', 'Invalid email format'],
      ['an empty email', '""', 'BAD_USER_INPUT', /Email is required/],
      ['a non-string email', '123', 'GRAPHQL_VALIDATION_FAILED', /String cannot represent/],
    ])('rejects %s (sad)', async (_label, email, code, message) => {
      await fails(
        `mutation { createOrLoginUser(data: { email: ${email} }) { id } }`,
        code,
        message,
      );
    });

    it('rejects a missing email (sad)', async () => {
      await fails(
        'mutation { createOrLoginUser(data: {}) { id } }',
        'GRAPHQL_VALIDATION_FAILED',
        /email/,
      );
    });
  });

  describe('getUser', () => {
    it('returns a user by id', async () => {
      const id = await createUser('getuser@example.com');
      const data = await ok(`{ getUser(id: ${id}) { id email } }`);
      expect(data.getUser).toEqual({ id, email: 'getuser@example.com' });
    });

    it('returns null for a nonexistent id (sad)', async () => {
      expect((await ok('{ getUser(id: 99999) { id } }')).getUser).toBeNull();
    });

    it('rejects a non-numeric id (sad)', async () => {
      await fails('{ getUser(id: "x") { id } }', 'GRAPHQL_VALIDATION_FAILED');
    });

    it('rejects a missing id (sad)', async () => {
      await fails('{ getUser { id } }', 'GRAPHQL_VALIDATION_FAILED', /"id"/);
    });
  });

  describe('getUsers', () => {
    beforeAll(async () => {
      await createUser('page-a@example.com');
      await createUser('page-b@example.com');
    });

    it('returns a paginated list with defaults (page 1, limit 20)', async () => {
      const data = await ok('{ getUsers { items { id email } total page pages } }');
      const { items, total, page, pages } = data.getUsers;
      expect(page).toBe(1);
      expect(items.length).toBe(Math.min(total, 20));
      expect(pages).toBe(Math.ceil(total / 20) || 1);
    });

    it('respects limit and returns different items per page', async () => {
      const p1 = await ok('{ getUsers(page: 1, limit: 1) { items { id } pages } }');
      const p2 = await ok('{ getUsers(page: 2, limit: 1) { items { id } } }');
      expect(p1.getUsers.items).toHaveLength(1);
      expect(p1.getUsers.pages).toBeGreaterThan(1);
      expect(p2.getUsers.items[0].id).not.toBe(p1.getUsers.items[0].id);
    });

    it('returns an empty page past the end', async () => {
      const data = await ok('{ getUsers(page: 9999, limit: 100) { items { id } page } }');
      expect(data.getUsers).toEqual({ items: [], page: 9999 });
    });

    it.each([
      ['page 0', 'page: 0', 'page must not be less than 1'],
      ['limit 0', 'limit: 0', 'limit must not be less than 1'],
      ['limit 101', 'limit: 101', 'limit must not be greater than 100'],
    ])('rejects %s (sad)', async (_label, args, message) => {
      await fails(`{ getUsers(${args}) { total } }`, 'BAD_USER_INPUT', message);
    });

    it('rejects a non-integer page (sad)', async () => {
      await fails('{ getUsers(page: 1.5) { total } }', 'GRAPHQL_VALIDATION_FAILED');
    });
  });

  describe('updateUser', () => {
    let id: number;

    beforeAll(async () => {
      id = await createUser('update@example.com');
      await createUser('taken@example.com');
    });

    it('updates and normalizes the email', async () => {
      const data = await ok(
        `mutation { updateUser(data: { id: ${id}, email: "Updated@Example.com" }) { id email } }`,
      );
      expect(data.updateUser).toEqual({ id, email: 'updated@example.com' });
    });

    it('allows keeping the same email', async () => {
      const data = await ok(
        `mutation { updateUser(data: { id: ${id}, email: "updated@example.com" }) { email } }`,
      );
      expect(data.updateUser.email).toBe('updated@example.com');
    });

    it.each([
      ['a nonexistent user', '99999', '"x@example.com"', 'NOT_FOUND', 'User not found'],
      ['an email in use', 'ID', '"taken@example.com"', 'BAD_USER_INPUT', 'Email is already in use by another account'],
      ['an invalid email', 'ID', '"bad"', 'BAD_USER_INPUT', 'Invalid email format'],
      ['a non-positive id', '0', '"x@example.com"', 'BAD_USER_INPUT', 'User ID must be a positive number'],
    ])('rejects %s (sad)', async (_label, userId, email, code, message) => {
      await fails(
        `mutation { updateUser(data: { id: ${userId.replace('ID', String(id))}, email: ${email} }) { id } }`,
        code,
        message,
      );
    });
  });

  describe('deleteUser', () => {
    it('deletes the user and cascades to their messages', async () => {
      const id = await createUser('delete@example.com');
      const messageId = await createMessage(id, 'will cascade');

      const data = await ok(`mutation { deleteUser(data: { id: ${id} }) { id email } }`);
      expect(data.deleteUser).toEqual({ id, email: 'delete@example.com' });

      expect((await ok(`{ getUser(id: ${id}) { id } }`)).getUser).toBeNull();
      expect((await ok(`{ getMessage(id: ${messageId}) { id } }`)).getMessage).toBeNull();
    });

    it.each([
      ['a nonexistent user', '99999', 'NOT_FOUND', 'User not found'],
      ['a non-positive id', '-1', 'BAD_USER_INPUT', 'User ID must be a positive number'],
    ])('rejects %s (sad)', async (_label, id, code, message) => {
      await fails(`mutation { deleteUser(data: { id: ${id} }) { id } }`, code, message);
    });
  });

  // ─── Messages ───────────────────────────────────────────────

  describe('messages', () => {
    let userId: number;
    let otherUserId: number;

    beforeAll(async () => {
      userId = await createUser('author@example.com');
      otherUserId = await createUser('other@example.com');
    });

    describe('createMessage', () => {
      it('creates a message with every output field', async () => {
        const data = await ok(
          `mutation { createMessage(data: { userId: ${userId}, content: "Hello!" }) {
            id content userId createdAt updatedAt user { id email }
          } }`,
        );
        expect(data.createMessage).toEqual({
          id: expect.any(Number),
          content: 'Hello!',
          userId,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
          user: { id: userId, email: 'author@example.com' },
        });
      });

      it('accepts exactly 500 characters', async () => {
        const content = 'x'.repeat(500);
        const data = await ok(
          `mutation { createMessage(data: { userId: ${userId}, content: "${content}" }) { content } }`,
        );
        expect(data.createMessage.content).toHaveLength(500);
      });

      it.each([
        ['empty content', 'ID', '""', 'BAD_USER_INPUT', 'Message content cannot be empty'],
        ['content over 500 chars', 'ID', `"${'x'.repeat(501)}"`, 'BAD_USER_INPUT', 'Message content must be at most 500 characters'],
        ['a non-positive userId', '0', '"hi"', 'BAD_USER_INPUT', 'User ID must be a positive number'],
        ['a nonexistent user', '99999', '"hi"', 'NOT_FOUND', 'User not found'],
      ])('rejects %s (sad)', async (_label, uid, content, code, message) => {
        await fails(
          `mutation { createMessage(data: { userId: ${uid.replace('ID', String(userId))}, content: ${content} }) { id } }`,
          code,
          message,
        );
      });

      it('rejects a missing content field (sad)', async () => {
        await fails(
          `mutation { createMessage(data: { userId: ${userId} }) { id } }`,
          'GRAPHQL_VALIDATION_FAILED',
          /content/,
        );
      });
    });

    describe('getMessage', () => {
      it('returns a message by id', async () => {
        const id = await createMessage(userId, 'single');
        const data = await ok(`{ getMessage(id: ${id}) { id content userId } }`);
        expect(data.getMessage).toEqual({ id, content: 'single', userId });
      });

      it('returns null for a nonexistent id (sad)', async () => {
        expect((await ok('{ getMessage(id: 99999) { id } }')).getMessage).toBeNull();
      });

      it('rejects a non-numeric id (sad)', async () => {
        await fails('{ getMessage(id: "x") { id } }', 'GRAPHQL_VALIDATION_FAILED');
      });
    });

    describe('getMessages', () => {
      it('returns newest first with resolved authors', async () => {
        await createMessage(otherUserId, 'older');
        await createMessage(userId, 'newest');

        const data = await ok(
          '{ getMessages(page: 1, limit: 2) { items { content user { email } } total page pages } }',
        );
        const { items, page, pages, total } = data.getMessages;
        expect(items[0]).toEqual({ content: 'newest', user: { email: 'author@example.com' } });
        expect(page).toBe(1);
        expect(pages).toBe(Math.ceil(total / 2));
      });

      it('batches author lookups across many messages (DataLoader)', async () => {
        const data = await ok('{ getMessages(limit: 100) { items { userId user { id } } } }');
        for (const item of data.getMessages.items) {
          expect(item.user.id).toBe(item.userId);
        }
      });

      it.each([
        ['page 0', 'page: 0', 'page must not be less than 1'],
        ['limit 101', 'limit: 101', 'limit must not be greater than 100'],
      ])('rejects %s (sad)', async (_label, args, message) => {
        await fails(`{ getMessages(${args}) { total } }`, 'BAD_USER_INPUT', message);
      });
    });

    describe('getMessagesFromUser', () => {
      it('returns only that user\'s messages, paginated', async () => {
        const uid = await createUser('from-user@example.com');
        await createMessage(uid, 'a');
        await createMessage(uid, 'b');

        const data = await ok(
          `{ getMessagesFromUser(userId: ${uid}, page: 1, limit: 1) { items { userId } total pages } }`,
        );
        expect(data.getMessagesFromUser).toEqual({ items: [{ userId: uid }], total: 2, pages: 2 });
      });

      it('pages are stable for messages created in the same second', async () => {
        const uid = await createUser('same-second@example.com');
        const ids = [];
        for (let i = 0; i < 5; i++) ids.push(await createMessage(uid, `m${i}`));

        const seen = [];
        for (let page = 1; page <= 5; page++) {
          const data = await ok(
            `{ getMessagesFromUser(userId: ${uid}, page: ${page}, limit: 1) { items { id } } }`,
          );
          seen.push(data.getMessagesFromUser.items[0].id);
        }
        expect(seen).toEqual([...ids].reverse());
      });

      it('returns an empty list for a user with no messages', async () => {
        const data = await ok('{ getMessagesFromUser(userId: 99999) { items { id } total pages } }');
        expect(data.getMessagesFromUser).toEqual({ items: [], total: 0, pages: 1 });
      });

      it.each([
        ['a non-positive userId', 'userId: 0', 'BAD_USER_INPUT', 'User ID must be a positive number'],
        ['limit 101', 'userId: 1, limit: 101', 'BAD_USER_INPUT', 'limit must not be greater than 100'],
        ['a missing userId', 'page: 1', 'GRAPHQL_VALIDATION_FAILED', /userId/],
      ])('rejects %s (sad)', async (_label, args, code, message) => {
        await fails(`{ getMessagesFromUser(${args}) { total } }`, code, message);
      });
    });

    describe('updateMessage', () => {
      let messageId: number;

      beforeAll(async () => {
        messageId = await createMessage(userId, 'to update');
      });

      it('updates the content for the author', async () => {
        const data = await ok(
          `mutation { updateMessage(data: { id: ${messageId}, userId: ${userId}, content: "Edited" }) { id content } }`,
        );
        expect(data.updateMessage).toEqual({ id: messageId, content: 'Edited' });
      });

      it.each([
        ['a nonexistent message', '99999', 'UID', '"x"', 'NOT_FOUND', 'Message not found'],
        ['a non-author', 'MID', 'OTHER', '"x"', 'FORBIDDEN', 'You are not the author of this message'],
        ['empty content', 'MID', 'UID', '""', 'BAD_USER_INPUT', 'Message content cannot be empty'],
        ['content over 500 chars', 'MID', 'UID', `"${'x'.repeat(501)}"`, 'BAD_USER_INPUT', 'Message content must be at most 500 characters'],
        ['a non-positive id', '0', 'UID', '"x"', 'BAD_USER_INPUT', 'Message ID must be a positive number'],
      ])('rejects %s (sad)', async (_label, id, uid, content, code, message) => {
        const ids = { MID: messageId, UID: userId, OTHER: otherUserId } as Record<string, number>;
        await fails(
          `mutation { updateMessage(data: { id: ${ids[id] ?? id}, userId: ${ids[uid] ?? uid}, content: ${content} }) { id } }`,
          code,
          message,
        );
      });

      it('keeps the content unchanged after a forbidden update', async () => {
        const data = await ok(`{ getMessage(id: ${messageId}) { content } }`);
        expect(data.getMessage.content).toBe('Edited');
      });
    });

    describe('deleteMessage', () => {
      let messageId: number;

      beforeAll(async () => {
        messageId = await createMessage(userId, 'to delete');
      });

      it.each([
        ['a non-author', 'OTHER', 'FORBIDDEN', 'Message does not exist or you are not the message author'],
        ['a non-positive userId', '0', 'BAD_USER_INPUT', 'User ID must be a positive number'],
      ])('rejects %s and keeps the message (sad)', async (_label, uid, code, message) => {
        const userArg = uid === 'OTHER' ? otherUserId : uid;
        await fails(
          `mutation { deleteMessage(data: { id: ${messageId}, userId: ${userArg} }) { id } }`,
          code,
          message,
        );
        expect((await ok(`{ getMessage(id: ${messageId}) { id } }`)).getMessage).not.toBeNull();
      });

      it('deletes the message for the author', async () => {
        const data = await ok(
          `mutation { deleteMessage(data: { id: ${messageId}, userId: ${userId} }) { id content userId } }`,
        );
        expect(data.deleteMessage).toEqual({ id: messageId, content: 'to delete', userId });
        expect((await ok(`{ getMessage(id: ${messageId}) { id } }`)).getMessage).toBeNull();
      });

      it('rejects a nonexistent message (sad)', async () => {
        await fails(
          `mutation { deleteMessage(data: { id: ${messageId}, userId: ${userId} }) { id } }`,
          'FORBIDDEN',
          'Message does not exist or you are not the message author',
        );
      });
    });
  });

  // ─── Subscription ───────────────────────────────────────────

  describe('messageAdded subscription', () => {
    let client: Client;

    beforeAll(() => {
      const { port } = app.getHttpServer().address();
      client = createClient({
        url: `ws://localhost:${port}/graphql`,
        webSocketImpl: WebSocket,
      });
    });

    afterAll(() => client.dispose());

    function nextEvent(): Promise<any> {
      return new Promise((resolve, reject) => {
        const unsubscribe = client.subscribe(
          { query: 'subscription { messageAdded { id content userId user { email } } }' },
          {
            next: value => {
              unsubscribe();
              resolve(value);
            },
            error: reject,
            complete: () => undefined,
          },
        );
      });
    }

    it('pushes created messages to subscribers', async () => {
      const userId = await createUser('sub@example.com');
      const event = nextEvent();
      await new Promise(r => setTimeout(r, 200));

      const messageId = await createMessage(userId, 'live!');

      expect(await event).toEqual({
        data: {
          messageAdded: {
            id: messageId,
            content: 'live!',
            userId,
            user: { email: 'sub@example.com' },
          },
        },
      });
    });

    it('does not push when creation fails (sad)', async () => {
      const received: unknown[] = [];
      const unsubscribe = client.subscribe(
        { query: 'subscription { messageAdded { id } }' },
        { next: v => received.push(v), error: () => undefined, complete: () => undefined },
      );
      await new Promise(r => setTimeout(r, 200));

      await fails(
        'mutation { createMessage(data: { userId: 99999, content: "nope" }) { id } }',
        'NOT_FOUND',
      );
      await new Promise(r => setTimeout(r, 300));

      unsubscribe();
      expect(received).toHaveLength(0);
    });

    it('rejects an invalid subscription selection (sad)', async () => {
      await expect(
        new Promise((resolve, reject) => {
          client.subscribe(
            { query: 'subscription { messageAdded { nope } }' },
            { next: resolve, error: reject, complete: () => undefined },
          );
        }),
      ).rejects.toEqual([expect.objectContaining({ message: expect.stringContaining('nope') })]);
    });
  });

  // ─── Malformed requests ─────────────────────────────────────

  describe('malformed requests', () => {
    it('returns 400 for a syntax error', async () => {
      const { status, body } = await gql('{ getStats { users');
      expect(status).toBe(400);
      expect(body.errors[0].extensions.code).toBe('GRAPHQL_PARSE_FAILED');
    });

    it('returns 400 for an unknown root field', async () => {
      const { status, body } = await gql('{ thisFieldDoesNotExist }');
      expect(status).toBe(400);
      expect(body.errors[0].extensions.code).toBe('GRAPHQL_VALIDATION_FAILED');
    });

    it('rejects a variable of the wrong type', async () => {
      const { body } = await gql('query ($id: Float!) { getUser(id: $id) { id } }', { id: 'abc' });
      expect(body.errors[0].extensions.code).toBe('BAD_USER_INPUT');
    });

    it('returns 400 for an empty body', async () => {
      const res = await request(app.getHttpServer()).post('/graphql').send({});
      expect(res.status).toBe(400);
    });

    it('accepts variables (happy)', async () => {
      const id = await createUser('vars@example.com');
      const data = await ok('query ($id: Float!) { getUser(id: $id) { email } }', { id });
      expect(data.getUser.email).toBe('vars@example.com');
    });
  });
});
