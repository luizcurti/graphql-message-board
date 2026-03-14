# Back-End — NestJS + GraphQL + TypeORM

Code-first GraphQL API built with NestJS 10, TypeORM 0.3, and SQLite.

## 🚀 Technologies

- **NestJS** v10 — Node.js framework
- **GraphQL** v16 — Code-first schema with Apollo Server Express 3
- **TypeORM** v0.3 — Modern `DataSource` API (no deprecated `getRepository`)
- **SQLite** — Lightweight relational database
- **DataLoader** — Per-request batch loading to prevent N+1 queries
- **class-validator + class-transformer** — Decorator-based input validation
- **TypeScript** v5.3
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
- **GraphQL Playground**: http://localhost:3333/graphql

## 🧪 Tests

```bash
# Unit tests (30 tests, 3 suites)
npm run test

# Watch mode
npm run test:watch

# E2E tests (33 tests, 2 suites)
npm run test:e2e

# Coverage report
npm run test:cov
```

### Unit test suites

| File | Resolver tested | Tests |
|---|---|---|
| `src/app.controller.spec.ts` | `StatsResolver` | 2 |
| `src/resolvers/user.resolver.spec.ts` | `UserResolver` | 11 |
| `src/resolvers/message.resolver.spec.ts` | `MessageResolver` | 17 |

### E2E test suites

| File | Scope | Tests |
|---|---|---|
| `test/app.e2e-spec.ts` | Smoke test — `getStats` | 1 |
| `test/graphql.e2e-spec.ts` | All resolvers, validation, errors | 32 |

## 🔍 Lint and Formatting

```bash
# Run ESLint with auto-fix
npm run lint

# Format code with Prettier
npm run format
```

## 🗄️ Database

The project uses SQLite and TypeORM. The database is automatically created at `data/rocketseat.db`.

### Migrations

```bash
# Run migrations
npm run typeorm migration:run

# Revert migration
npm run typeorm migration:revert

# Create new migration
npm run typeorm migration:create -n MigrationName
```

## 📊 GraphQL Schema

The schema is auto-generated at `schema.gql` from the code-first resolvers.

### Queries

```graphql
# Paginated users
query {
  getUsers(page: 1, limit: 20) {
    items { id email createdAt }
    total
    page
    pages
  }
}

# Single user
query {
  getUser(id: 1) { id email }
}

# Paginated messages
query {
  getMessages(page: 1, limit: 20) {
    items { id content user { email } }
    total
    page
    pages
  }
}

# Messages by user
query {
  getMessagesFromUser(userId: 1, page: 1, limit: 10) {
    items { id content }
    total
    pages
  }
}
```

### Mutations

```graphql
# Create or login user
mutation { createOrLoginUser(data: { email: "user@example.com" }) { id email } }

# Update user
mutation { updateUser(data: { id: 1, email: "new@example.com" }) { id email } }

# Delete user
mutation { deleteUser(data: { id: 1 }) { id } }

# Create message
mutation { createMessage(data: { userId: 1, content: "Hello!" }) { id content } }

# Update message (owner only)
mutation { updateMessage(data: { id: 1, userId: 1, content: "Updated" }) { id content } }

# Delete message (owner only)
mutation { deleteMessage(data: { id: 1, userId: 1 }) { id } }
```

### Subscriptions

```graphql
subscription {
  messageAdded { id content user { email } }
}
```

## 🛡️ Validation & Error Handling

All `@InputType()` classes use `class-validator` decorators (`@IsEmail`, `@IsNotEmpty`, `@IsPositive`, `@MaxLength`). A global `ValidationPipe` rejects invalid payloads before they reach resolvers.

Resolvers throw `GraphQLError` with structured `extensions.code`:
- `NOT_FOUND` — entity does not exist
- `FORBIDDEN` — operation not allowed for this user
- `BAD_USER_INPUT` — invalid input data

## 🔄 DataLoader

`UserLoader` is created **per request** via the `createContext(dataSource)` factory injected into `GraphQLModule.forRootAsync`. This ensures DataLoader batching state is never shared across requests.

## 📁 Project Structure

```
src/
├── config/
│   ├── orm.ts             # TypeORM DataSource options
│   └── data-source.ts     # DataSource export for TypeORM CLI (migrations)
├── db/
│   ├── loaders/
│   │   ├── index.ts       # createContext() factory + GQLContext type
│   │   └── UserLoader.ts  # DataLoader batch function
│   ├── migrations/        # TypeORM migrations
│   └── models/            # User, Message entities
├── resolvers/
│   ├── input/             # InputTypes (user, message, pagination args)
│   ├── types/             # ObjectTypes (PaginatedUsers, PaginatedMessages, Stats)
│   ├── user.resolver.ts
│   ├── message.resolver.ts
│   └── stats.resolver.ts  # getStats query (users + messages count)
├── app.module.ts          # Root module — 100% GraphQL, no controllers
├── repo.module.ts
├── repo.service.ts
└── main.ts                # Bootstrap + global ValidationPipe
```

## 🔧 Configuration

The SQLite database is configured in `src/config/orm.ts`:
- **Database**: `data/rocketseat.db`
- **Logging**: Enabled for development
- **Entities**: Automatically loaded from `src/db/models`
- **Migrations**: Loaded from `src/db/migrations`

## ✅ Project Status

| Item | Status |
|---|---|
| Build | ✅ No errors |
| Unit tests | ✅ 30/30 — `stats`, `user`, `message` resolvers |
| E2E tests | ✅ 33/33 — all queries, mutations and edge cases |
| Lint | ✅ ESLint — zero errors |
| Vulnerabilities | ✅ 0 |
| TypeScript | ✅ Strict, no errors |
| Architecture | ✅ 100% GraphQL — no REST endpoints |
| Input validation | ✅ Global `ValidationPipe` + `class-validator` |
| Error handling | ✅ `GraphQLError` with `extensions.code` |
| DataLoader | ✅ Per-request, no shared state |
| Pagination | ✅ All list queries |
| CRUD | ✅ Full User + Message CRUD |
