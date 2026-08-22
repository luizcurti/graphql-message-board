# GraphQL Message Board — Back-End

Code-first GraphQL API built with NestJS 10, TypeORM 0.3, and SQLite.

## 🚀 Technologies

- **NestJS** v10 — Node.js framework
- **GraphQL** v16 — Code-first schema with Apollo Server (`@nestjs/apollo`, `@apollo/server`)
- **TypeORM** v0.3 — Modern `DataSource` API (no deprecated `getRepository`)
- **SQLite** — Lightweight relational database, migrations run automatically on boot
- **DataLoader** — Per-request batch loading to prevent N+1 queries
- **class-validator + class-transformer** — Decorator-based input validation
- **TypeScript** v5, strict mode
- **Jest** — Unit and E2E testing

## 📦 Installation

```bash
npm install
```

## 🏃 Running the application

```bash
# Development with watch mode
npm run start:dev

# Development
npm run start

# Debug mode
npm run start:debug

# Production
npm run build
npm run start:prod
```

The application will be available at:
- **API**: http://localhost:3333
- **GraphQL Playground**: http://localhost:3333/graphql (disabled when `NODE_ENV=production`)

### Docker

```bash
docker build -t graphql-message-board-backend .
docker run -p 3333:3333 graphql-message-board-backend
```

Or use `docker compose up --build` from the repo root to run this alongside the frontend.

## 🧪 Tests

```bash
# Unit tests (41 tests, 5 suites)
npm run test

# Watch mode
npm run test:watch

# E2E tests (34 tests, 1 suite)
npm run test:e2e

# Coverage report
npm run test:cov

# Postman collection (27 requests / 78 assertions) — server must already be running
npm run test:collection
```

### Unit test suites

| File | Scope | 
|---|---|
| `src/resolvers/stats.resolver.spec.ts` | `StatsResolver` |
| `src/resolvers/user.resolver.spec.ts` | `UserResolver` → `UserService` delegation |
| `src/resolvers/message.resolver.spec.ts` | `MessageResolver` → `MessageService` delegation |
| `src/services/user.service.spec.ts` | `UserService` business rules (happy + sad paths) |
| `src/services/message.service.spec.ts` | `MessageService` business rules (happy + sad paths) |

### E2E test suite

| File | Scope |
|---|---|
| `test/graphql.e2e-spec.ts` | Every query/mutation, validation errors, ownership checks, malformed requests |

## 🔍 Lint and Formatting

```bash
npm run lint
npm run format
```

## 🗄️ Database

SQLite via TypeORM, stored at `data/chatterbox.db`. Migrations run **automatically on application boot** (`migrationsRun: true` outside of tests) — a fresh database is fully schema'd on first start, no manual step required.

### Migrations

```bash
npm run typeorm -- migration:run
npm run typeorm -- migration:revert
npm run typeorm -- migration:generate src/db/migrations/MigrationName
```

## 📊 GraphQL Schema

Auto-generated at `schema.gql` from the code-first resolvers on every boot.

### Queries

```graphql
query { getUsers(page: 1, limit: 20) { items { id email createdAt } total page pages } }
query { getUser(id: 1) { id email } }
query { getMessages(page: 1, limit: 20) { items { id content user { email } } total page pages } }
query { getMessagesFromUser(userId: 1, page: 1, limit: 10) { items { id content } total pages } }
```

### Mutations

```graphql
mutation { createOrLoginUser(data: { email: "user@example.com" }) { id email } }
mutation { updateUser(data: { id: 1, email: "new@example.com" }) { id email } }
mutation { deleteUser(data: { id: 1 }) { id } }
mutation { createMessage(data: { userId: 1, content: "Hello!" }) { id content } }
mutation { updateMessage(data: { id: 1, userId: 1, content: "Updated" }) { id content } }
mutation { deleteMessage(data: { id: 1, userId: 1 }) { id } }
```

### Subscriptions

```graphql
subscription { messageAdded { id content user { email } } }
```

## 🛡️ Validation & Error Handling

All `@InputType()`/`@ArgsType()` classes use `class-validator` decorators (`@IsEmail`, `@IsNotEmpty`, `@IsPositive`, `@MaxLength`, `@IsInt`). A global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`) rejects invalid or unexpected payload shapes before they reach a resolver.

Services throw `GraphQLError` with structured `extensions.code`:
- `NOT_FOUND` — entity does not exist
- `FORBIDDEN` — operation not allowed for this user
- `BAD_USER_INPUT` — invalid input data (including GraphQL variable coercion failures)

## 🌐 CORS

`app.enableCors()` is called in `main.ts`. Without it, a real browser blocks every request from the front-end (a different origin — port 3000 vs. 3333) even though `curl`/`supertest`-based tests never notice, since they don't enforce CORS. This was caught by the Playwright suite in `../e2e/`, not by any test that talks to the API directly.

## 🔗 Referential integrity

`messages.user_id` has a `FOREIGN KEY ... REFERENCES users(id) ON DELETE CASCADE`, applied by the `createMessages` migration (`queryRunner.createForeignKey`). Deleting a user cascades to their messages at the database level — there's no application-level cleanup code for this.

## 🔄 DataLoader

`UserLoader` is created **per request** via the `createContext(dataSource)` factory injected into `GraphQLModule.forRootAsync`, so batching state is never shared across requests.

## 📁 Project Structure

```
src/
├── config/
│   ├── orm.ts              # TypeORM DataSource options (NestJS module)
│   └── data-source.ts      # DataSource export for the TypeORM CLI (migrations)
├── db/
│   ├── loaders/             # createContext() factory + UserLoader (DataLoader)
│   ├── migrations/          # TypeORM migrations
│   └── models/               # User, Message entities
├── services/
│   ├── user.service.ts       # Business rules: find-or-create, email uniqueness
│   └── message.service.ts    # Business rules: ownership checks, publish on create
├── common/
│   └── paginate.ts            # Shared pagination helper
├── resolvers/
│   ├── input/                 # InputTypes / ArgsTypes
│   ├── types/                  # ObjectTypes (PaginatedUsers, PaginatedMessages, Stats)
│   ├── user.resolver.ts         # Thin — delegates to UserService
│   ├── message.resolver.ts      # Thin — delegates to MessageService
│   └── stats.resolver.ts
├── pubsub.ts                    # Shared PubSub instance (messageAdded)
├── app.module.ts                # Root module — 100% GraphQL, no REST controllers
├── repo.module.ts
├── repo.service.ts
└── main.ts                      # Bootstrap + global ValidationPipe
```

## ✅ Project Status

| Item | Status |
|---|---|
| Build | ✅ No errors |
| TypeScript | ✅ Strict mode, no errors |
| Unit tests | ✅ 41/41 — services + resolver delegation |
| E2E tests | ✅ 34/34 — every query, mutation, and edge case |
| Postman collection | ✅ 27 requests / 78 assertions |
| Browser E2E (`../e2e/`) | ✅ 3/3 — real front-end vs. this API |
| CORS | ✅ Enabled — real browsers can reach the API |
| Referential integrity | ✅ `messages.user_id` FK, `ON DELETE CASCADE` |
| Lint | ✅ ESLint — zero errors |
| Architecture | ✅ Resolver → Service → Repository, 100% GraphQL |
| Input validation | ✅ Global `ValidationPipe` + `class-validator` |
| Error handling | ✅ `GraphQLError` with `extensions.code` |
| DataLoader | ✅ Per-request, no shared state |
| Pagination | ✅ All list queries |
| CRUD | ✅ Full User + Message CRUD |
| Migrations | ✅ Run automatically on boot |
