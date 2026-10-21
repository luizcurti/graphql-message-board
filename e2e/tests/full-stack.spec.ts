import { test, expect, APIRequestContext, Page } from '@playwright/test';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3333';

let seq = 0;
const unique = (prefix: string) => `${prefix}-${Date.now()}-${seq++}`;

async function graphql(request: APIRequestContext, query: string, variables = {}) {
  const response = await request.post(`${BACKEND_URL}/graphql`, { data: { query, variables } });
  const body = await response.json();
  if (body.errors) {
    throw new Error(`GraphQL error: ${JSON.stringify(body.errors)}`);
  }
  return body.data;
}

async function createUser(request: APIRequestContext, email: string): Promise<number> {
  const data = await graphql(
    request,
    'mutation ($email: String!) { createOrLoginUser(data: { email: $email }) { id } }',
    { email },
  );
  return data.createOrLoginUser.id;
}

async function createMessage(request: APIRequestContext, userId: number, content: string) {
  await graphql(
    request,
    'mutation ($userId: Float!, $content: String!) { createMessage(data: { userId: $userId, content: $content }) { id } }',
    { userId, content },
  );
}

async function messagesOf(request: APIRequestContext, userId: number): Promise<string[]> {
  const data = await graphql(
    request,
    'query ($userId: Float!) { getMessagesFromUser(userId: $userId, limit: 100) { items { content } } }',
    { userId },
  );
  return data.getMessagesFromUser.items.map((m: { content: string }) => m.content);
}

async function deleteUser(request: APIRequestContext, id: number) {
  await graphql(request, 'mutation ($id: Float!) { deleteUser(data: { id: $id }) { id } }', { id }).catch(
    () => undefined,
  );
}

// Resolves with the next alert/confirm text and answers it.
function nextDialog(page: Page, accept = true): Promise<string> {
  return new Promise((resolve) => {
    page.once('dialog', async (dialog) => {
      const message = dialog.message();
      await (accept ? dialog.accept() : dialog.dismiss());
      resolve(message);
    });
  });
}

function messageItem(page: Page, content: string) {
  return page.getByText(content, { exact: true }).locator('..');
}

async function openBoard(page: Page, userId?: number) {
  await page.goto(userId ? `/dashboard?id=${userId}` : '/dashboard');
  await expect(page.getByRole('heading', { name: 'Message Board' })).toBeVisible();
}

async function send(page: Page, content: string) {
  await page.getByPlaceholder('Write a message...').fill(content);
  await page.getByRole('button', { name: 'Send' }).click();
}

const users: number[] = [];

test.afterEach(async ({ request }) => {
  while (users.length) await deleteUser(request, users.pop()!);
});

// ─── Home (/) ─────────────────────────────────────────────────

test.describe('Home — login / register', () => {
  test('registers a new user and redirects to their board', async ({ page, request }) => {
    const email = `${unique('pw')}@example.com`;

    await page.goto('/');
    await page.getByPlaceholder('E-mail').fill(email);
    await page.getByText('Login or Register').click();

    await expect(page).toHaveURL(/\/dashboard\?id=\d+$/);
    const userId = Number(new URL(page.url()).searchParams.get('id'));
    users.push(userId);

    const data = await graphql(request, `{ getUser(id: ${userId}) { email } }`);
    expect(data.getUser.email).toBe(email);
    await expect(page.getByRole('heading', { name: 'Message Board' })).toBeVisible();
  });

  test('logs an existing user in with a case-insensitive e-mail', async ({ page, request }) => {
    const email = `${unique('pw-login')}@example.com`;
    const userId = await createUser(request, email);
    users.push(userId);

    await page.goto('/');
    await page.getByPlaceholder('E-mail').fill(`  ${email.toUpperCase()}  `);
    await page.getByText('Login or Register').click();

    await expect(page).toHaveURL(`/dashboard?id=${userId}`);
  });

  for (const [label, value] of [
    ['empty', ''],
    ['whitespace-only', '   '],
  ]) {
    test(`sad: ${label} e-mail alerts and stays on /`, async ({ page }) => {
      await page.goto('/');
      await page.getByPlaceholder('E-mail').fill(value);
      const alert = nextDialog(page);
      await page.getByText('Login or Register').click();

      expect(await alert).toBe('Insert a valid e-mail!');
      await expect(page).toHaveURL('/');
    });
  }

  test('sad: invalid e-mail shows the server validation message', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder('E-mail').fill('not-an-email');
    const alert = nextDialog(page);
    await page.getByText('Login or Register').click();

    expect(await alert).toBe('Invalid email format');
    await expect(page).toHaveURL('/');
  });
});

// ─── Board (/dashboard) ───────────────────────────────────────

test.describe('Board — messages', () => {
  test('send → render → persist → reload → delete round trip', async ({ page, request }) => {
    const email = `${unique('pw-rt')}@example.com`;
    const content = unique('Round trip');
    const userId = await createUser(request, email);
    users.push(userId);

    await openBoard(page, userId);
    await send(page, content);

    const item = messageItem(page, content);
    await expect(item).toBeVisible();
    await expect(item.getByText(email)).toBeVisible();
    await expect(page.getByPlaceholder('Write a message...')).toHaveValue('');
    expect(await messagesOf(request, userId)).toEqual([content]);

    await page.reload();
    await expect(messageItem(page, content)).toBeVisible();

    const confirm = nextDialog(page);
    await messageItem(page, content).getByRole('img', { name: 'Delete message' }).click();
    expect(await confirm).toBe('Are you sure you want to delete this message?');

    await expect(page.getByText(content, { exact: true })).toHaveCount(0);
    expect(await messagesOf(request, userId)).toEqual([]);
  });

  test('sad: cancelling the delete confirmation keeps the message', async ({ page, request }) => {
    const content = unique('Keep me');
    const userId = await createUser(request, `${unique('pw-keep')}@example.com`);
    users.push(userId);
    await createMessage(request, userId, content);

    await openBoard(page, userId);
    const confirm = nextDialog(page, false);
    await messageItem(page, content).getByRole('img', { name: 'Delete message' }).click();
    await confirm;

    await expect(messageItem(page, content)).toBeVisible();
    expect(await messagesOf(request, userId)).toEqual([content]);
  });

  test('only own messages can be deleted', async ({ page, request }) => {
    const mine = unique('Mine');
    const theirs = unique('Theirs');
    const me = await createUser(request, `${unique('pw-me')}@example.com`);
    const other = await createUser(request, `${unique('pw-other')}@example.com`);
    users.push(me, other);
    await createMessage(request, other, theirs);
    await createMessage(request, me, mine);

    await openBoard(page, me);

    await expect(messageItem(page, mine).getByRole('img', { name: 'Delete message' })).toBeVisible();
    await expect(messageItem(page, theirs)).toBeVisible();
    await expect(messageItem(page, theirs).getByRole('img', { name: 'Delete message' })).toHaveCount(0);
  });

  for (const [label, value] of [
    ['empty', ''],
    ['whitespace-only', '   '],
  ]) {
    test(`sad: ${label} message alerts and creates nothing`, async ({ page, request }) => {
      const userId = await createUser(request, `${unique('pw-empty')}@example.com`);
      users.push(userId);

      await openBoard(page, userId);
      const alert = nextDialog(page);
      await send(page, value);

      expect(await alert).toBe('Message cannot be empty.');
      expect(await messagesOf(request, userId)).toEqual([]);
    });
  }

  test('the textarea caps messages at 500 chars and 500 is accepted', async ({ page, request }) => {
    const userId = await createUser(request, `${unique('pw-long')}@example.com`);
    users.push(userId);

    await openBoard(page, userId);
    const textarea = page.getByPlaceholder('Write a message...');
    await textarea.fill('x'.repeat(501));
    await expect(textarea).toHaveValue('x'.repeat(500));

    await page.getByRole('button', { name: 'Send' }).click();
    await expect(textarea).toHaveValue('');
    expect(await messagesOf(request, userId)).toEqual(['x'.repeat(500)]);
  });

  test('sad: a board without ?id refuses to send', async ({ page }) => {
    await openBoard(page);
    const alert = nextDialog(page);
    await send(page, 'Anonymous');

    expect(await alert).toBe('User not identified. Please log in again.');
  });

  test('sad: a board for a deleted user shows "User not found" and keeps the text', async ({ page, request }) => {
    const userId = await createUser(request, `${unique('pw-gone')}@example.com`);
    await deleteUser(request, userId);

    await openBoard(page, userId);
    const alert = nextDialog(page);
    await send(page, 'Ghost');

    expect(await alert).toBe('User not found');
    await expect(page.getByPlaceholder('Write a message...')).toHaveValue('Ghost');
  });

  test('paginates 10 per page with Prev/Next', async ({ page, request }) => {
    const userId = await createUser(request, `${unique('pw-page')}@example.com`);
    users.push(userId);
    const prefix = unique('Page');
    for (let i = 0; i <= 10; i++) await createMessage(request, userId, `${prefix} #${i}`);

    await openBoard(page, userId);
    const info = page.getByText(/^\d+ \/ \d+/);
    const [prev, next] = await info.locator('..').getByRole('button').all();

    await expect(info).toContainText('1 /');
    await expect(prev).toBeDisabled();
    await expect(next).toBeEnabled();
    await expect(page.getByText(`${prefix} #10`, { exact: true })).toBeVisible();
    await expect(page.getByText(`${prefix} #0`, { exact: true })).toHaveCount(0);

    await next.click();
    await expect(info).toContainText('2 /');
    await expect(page.getByText(`${prefix} #0`, { exact: true })).toBeVisible();
    await expect(prev).toBeEnabled();

    await prev.click();
    await expect(info).toContainText('1 /');
    await expect(page.getByText(`${prefix} #10`, { exact: true })).toBeVisible();
  });
});

// ─── Real time ────────────────────────────────────────────────

test.describe('Real time — messageAdded subscription', () => {
  test("a message from user A appears on user B's board without reload", async ({ page, request, browser }) => {
    const content = unique('Live');
    const a = await createUser(request, `${unique('pw-live-a')}@example.com`);
    const b = await createUser(request, `${unique('pw-live-b')}@example.com`);
    users.push(a, b);
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();

    try {
      await openBoard(page, a);
      await openBoard(pageB, b);

      await send(page, content);
      await expect(messageItem(page, content)).toBeVisible();

      await expect(messageItem(pageB, content)).toBeVisible({ timeout: 5000 });
      await expect(messageItem(pageB, content).getByRole('img', { name: 'Delete message' })).toHaveCount(0);
    } finally {
      await contextB.close();
    }
  });

  test('sad: a rejected message is not pushed to other boards', async ({ page, request, browser }) => {
    const content = unique('Rejected');
    const b = await createUser(request, `${unique('pw-live-sad')}@example.com`);
    users.push(b);
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();

    try {
      await openBoard(page, 999999);
      await openBoard(pageB, b);

      const alert = nextDialog(page);
      await send(page, content);
      expect(await alert).toBe('User not found');

      await pageB.waitForTimeout(1000);
      await expect(pageB.getByText(content)).toHaveCount(0);
    } finally {
      await contextB.close();
    }
  });
});

// ─── Routing ──────────────────────────────────────────────────

test.describe('Routing', () => {
  for (const path of ['/does-not-exist', '/dashboard/extra']) {
    test(`sad: ${path} renders the 404 page`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole('heading', { name: '404 - Page not found' })).toBeVisible();
    });
  }
});
