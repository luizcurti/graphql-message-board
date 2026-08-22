# GraphQL Message Board — Front-End

React 18 application consuming the NestJS GraphQL API.

## 🚀 Technologies

- **React** v18 — UI library
- **TypeScript** v4.9, strict mode — type safety
- **Apollo Client** v3 — GraphQL client
- **React Router** v6 — routing
- **Styled Components** v6 — CSS-in-JS styling
- **React Icons** v4 — icon library
- **React Testing Library + Jest** — component and hook tests

## 📦 Installation

```bash
npm install
```

## 🏃 Running the application

```bash
# Development mode
npm start

# Production build
npm run build

# Run tests
npm test -- --watchAll=false
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **GraphQL API**: must be running at http://localhost:3333/graphql

### Docker

```bash
docker build -t graphql-message-board-frontend .
docker run -p 3000:3000 graphql-message-board-frontend
```

Or use `docker compose up --build` from the repo root to run this alongside the backend.

## 🔧 Features

### Home Page (`/`)
- User login/registration with email
- Creates or authenticates a user via GraphQL mutation
- Redirects to the dashboard after authentication

### Dashboard (`/dashboard`)
- Displays paginated messages from the GraphQL API
- Create new messages via a textarea form
- Delete own messages (with confirmation dialog)
- Highlights own messages visually
- Pagination controls with Prev/Next and a page indicator
- Author email shown on each message

## 🏗️ Architecture

Pages are presentational only. All GraphQL calls, validation, and side effects (navigation, alerts) live in hooks:

```
src/
├── graphql/
│   ├── user.ts        # CREATE_OR_LOGIN_USER document + types
│   └── message.ts      # message queries/mutations + types
├── hooks/
│   ├── useAuth.ts        # login(email) — validation, mutation, navigation
│   └── useMessages.ts    # list/create/delete messages, pagination state
├── pages/
│   ├── Home/            # renders the login form, calls useAuth
│   └── Board/            # renders the message board, calls useMessages
├── services/
│   └── api.ts             # Apollo Client configuration
├── styles/
│   └── global.ts
├── App.tsx
├── routes.tsx
└── index.tsx              # entry point (React 18 createRoot)
```

This separation means `useAuth`/`useMessages` can be unit tested against a mocked Apollo Client without rendering any UI, and `Home`/`Board` can be tested for rendering/interaction without mocking business logic twice.

## 🧪 Testing

```bash
npm test -- --watchAll=false
```

| Suite | Scope |
|---|---|
| `src/hooks/useAuth.test.tsx` | Login happy path (navigates), empty-email sad path, server-error sad path |
| `src/hooks/useMessages.test.tsx` | Load/create/delete messages, validation sad paths, delete-confirmation decline |
| `src/pages/Home/index.test.tsx` | Renders the form, happy-path login, sad-path empty email |
| `src/pages/Board/index.test.tsx` | Renders messages, empty state, send message, empty-message sad path |

All GraphQL calls are mocked with `@apollo/client/testing`'s `MockedProvider` — no real network calls in tests. That's a deliberate trade-off: it's fast and isolates component/hook logic, but it can't catch bugs that only exist in a real browser talking to the real API (it wouldn't have caught the missing-CORS bug this project had, for instance). That gap is covered separately by [`../e2e/`](../e2e/README.md), which drives this app in a real browser against the real backend.

## ✅ Build Status

| Item | Status |
|---|---|
| TypeScript | ✅ Strict mode, no errors |
| Build | ✅ Compiles successfully |
| Unit tests | ✅ 16/16 — hooks + pages, happy and sad paths |
| Integration tests | ✅ 19/19 checks passing (`../e2e-integration-test.sh`, run against the built app) |
| Browser E2E | ✅ 3/3 — real Chromium vs. the real backend (`../e2e/`) |
| Vulnerabilities | ⚠️ `react-scripts` build-tooling only (dev dependency, not shipped) — see root README |

## 🚀 Deployment

```bash
npm run build
npx serve -s build
```

The `build` folder is a static bundle deployable to any static hosting service.

## 🔗 Backend Integration

This frontend connects to the NestJS GraphQL backend at `http://localhost:3333/graphql` (see `src/services/api.ts`). Make sure the backend is running before starting the frontend — or run `docker compose up --build` from the repo root to start both together. See the `back-end` folder for backend setup instructions.
