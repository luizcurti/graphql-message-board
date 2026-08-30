# Browser E2E — front-end + back-end together

Playwright tests that drive the **real, rendered** React app in a real browser against the **real** NestJS backend — no mocked GraphQL, no direct API calls standing in for the UI. Each test enters data through the actual page (typing into inputs, clicking buttons), then independently queries the backend via GraphQL to confirm what's on screen is really what got persisted.

This is a different guarantee than the other test layers in this repo:
- `back-end` unit/e2e tests exercise the API in isolation (no browser).
- `front-end` unit tests exercise components against a **mocked** Apollo Client (no real network call).
- `e2e-integration-test.sh` sends the GraphQL calls a front-end *would* send via `curl` — it never actually renders or interacts with the page, so it can't catch bugs that only exist in real browser behavior (e.g. CORS).

That last gap is exactly why this suite exists — it caught a real CORS bug (the backend didn't set `Access-Control-Allow-Origin`, so the actual browser blocked every request from the SPA) that none of the other layers could see.

## Running

Requires the full stack up first:

```bash
# from the repo root
docker compose up --build -d
```

Then:

```bash
cd e2e
npm install
npx playwright install --with-deps chromium   # first time only
npm test
```

Override the URLs if the stack is running elsewhere:

```bash
FRONTEND_URL=http://localhost:3000 BACKEND_URL=http://localhost:3333 npm test
```

## What's covered

| Test | Path |
|---|---|
| Register → send a message → see it rendered → confirm it's in the DB → delete it → confirm it's gone from the DB | Happy path, full round trip |
| A message sent by one user (one browser context) appears live on another user's board (a separate context, never reloaded) | Real-time — `messageAdded` subscription over WebSocket (`graphql-ws`) |
| Submit the login form with no e-mail | Sad path — `alert()`, no navigation |
| Send an empty message | Sad path — `alert()`, message not created |

Each test creates its own user with a unique e-mail and cleans up after itself (`deleteUser`, which cascades to that user's messages).
