# Browser E2E

Playwright tests that drive the real React app in Chromium against the real backend, then check the backend directly to confirm what was persisted.

## Run

```bash
docker compose up --build -d          # from the repo root
cd e2e
npm install
npx playwright install chromium       # first time only
npm test
```

Override targets with `FRONTEND_URL` and `BACKEND_URL` (defaults: `http://localhost:3000`, `http://localhost:3333`).

## Tests (18)

| Area | Covers |
|---|---|
| Home `/` | Register → redirect, case-insensitive login, empty / whitespace / invalid e-mail |
| Board `/dashboard` | Send → render → persist → reload → delete, cancel delete, only own messages deletable, empty / whitespace message, 500-char cap, missing `?id`, deleted user (text kept on error), pagination |
| Real time | Message from user A appears live for user B; a rejected message is not pushed |
| Routing | Unknown paths render the 404 page |

Tests don't depend on an empty database: each uses unique data and deletes its users afterwards (cascades to messages).
