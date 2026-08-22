import { test, expect, APIRequestContext } from '@playwright/test';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3333';

async function graphql(request: APIRequestContext, query: string) {
  const response = await request.post(`${BACKEND_URL}/graphql`, {
    data: { query },
  });
  const body = await response.json();
  if (body.errors) {
    throw new Error(`GraphQL error: ${JSON.stringify(body.errors)}`);
  }
  return body.data;
}

async function createUserDirectly(request: APIRequestContext, email: string) {
  const data = await graphql(
    request,
    `mutation { createOrLoginUser(data: { email: "${email}" }) { id } }`,
  );
  return data.createOrLoginUser.id as number;
}

async function deleteUser(request: APIRequestContext, id: number) {
  await graphql(request, `mutation { deleteUser(data: { id: ${id} }) { id } }`).catch(() => {});
}

test.describe('Full-stack round trip (real front-end + real back-end)', () => {
  test('register, send a message through the UI, and confirm the backend actually stored it', async ({
    page,
    request,
  }) => {
    const email = `pw-${Date.now()}@example.com`;
    const content = `Playwright message ${Date.now()}`;
    let userId: number | undefined;

    try {
      // 1. Enter data through the real front-end.
      await page.goto('/');
      await page.getByPlaceholder('E-mail').fill(email);
      await page.getByText('Login or Register').click();

      // 2. Front-end navigated after the real mutation resolved — extract the id the backend returned.
      await expect(page).toHaveURL(/\/dashboard\?id=\d+/);
      userId = Number(new URL(page.url()).searchParams.get('id'));
      expect(userId).toBeGreaterThan(0);

      // 3. Confirm the backend actually created the user with this exact email.
      const userData = await graphql(request, `{ getUser(id: ${userId}) { email } }`);
      expect(userData.getUser.email).toBe(email);

      // 4. Send a message through the real UI.
      await page.getByPlaceholder('Write a message...').fill(content);
      await page.getByRole('button', { name: 'Send' }).click();

      // 5. The message the backend echoed back must render in the UI.
      await expect(page.getByText(content)).toBeVisible();
      await expect(page.getByText(email)).toBeVisible();

      // 6. Independently confirm, via the backend, that what's on screen is what's in the database
      //    (not just something the front-end optimistically rendered).
      const messagesData = await graphql(
        request,
        `{ getMessagesFromUser(userId: ${userId}, page: 1, limit: 10) { items { content } } }`,
      );
      const storedContents = messagesData.getMessagesFromUser.items.map((m: { content: string }) => m.content);
      expect(storedContents).toContain(content);

      // 7. Delete it through the UI and confirm the round trip the other way too.
      page.once('dialog', (dialog) => dialog.accept());
      await page.getByRole('img', { name: 'Delete message' }).click();
      await expect(page.getByText(content)).not.toBeVisible();

      const afterDelete = await graphql(
        request,
        `{ getMessagesFromUser(userId: ${userId}, page: 1, limit: 10) { items { content } } }`,
      );
      const remaining = afterDelete.getMessagesFromUser.items.map((m: { content: string }) => m.content);
      expect(remaining).not.toContain(content);
    } finally {
      if (userId) await deleteUser(request, userId);
    }
  });

  test('sad path: submitting the login form with no e-mail alerts and does not navigate', async ({ page }) => {
    let alertMessage = '';
    page.once('dialog', (dialog) => {
      alertMessage = dialog.message();
      dialog.accept();
    });

    await page.goto('/');
    await page.getByText('Login or Register').click();

    expect(alertMessage).toBe('Insert a valid e-mail!');
    await expect(page).toHaveURL('/');
  });

  test('sad path: sending an empty message alerts and is not sent', async ({ page, request }) => {
    const email = `pw-sad-${Date.now()}@example.com`;
    const userId = await createUserDirectly(request, email);

    try {
      await page.goto(`/dashboard?id=${userId}`);
      await expect(page.getByText('No messages yet. Be the first to write one!')).toBeVisible();

      let alertMessage = '';
      page.once('dialog', (dialog) => {
        alertMessage = dialog.message();
        dialog.accept();
      });

      await page.getByRole('button', { name: 'Send' }).click();

      expect(alertMessage).toBe('Message cannot be empty.');
      await expect(page.getByText('No messages yet. Be the first to write one!')).toBeVisible();
    } finally {
      await deleteUser(request, userId);
    }
  });
});
