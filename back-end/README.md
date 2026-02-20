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
# Unit tests
npm run test

# Watch mode tests
npm run test:watch

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

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
│   └── orm.ts           # TypeORM DataSource options (export default)
├── db/
│   ├── loaders/
│   │   ├── index.ts     # createContext() factory + GQLContext type
│   │   └── UserLoader.ts# DataLoader batch function
│   ├── migrations/      # TypeORM migrations
│   └── models/          # User, Message entities
├── resolvers/
│   ├── input/           # InputTypes (user, message, pagination args)
│   ├── types/           # ObjectTypes (PaginatedUsers, PaginatedMessages)
│   ├── user.resolver.ts
│   └── message.resolver.ts
├── app.module.ts        # Root module (forRootAsync)
├── repo.module.ts
├── repo.service.ts
└── main.ts              # Bootstrap + global ValidationPipe
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
| Tests | ✅ Unit + E2E passing |
| Vulnerabilities | ✅ 0 |
| TypeScript | ✅ Strict, no errors |
| Input validation | ✅ Global `ValidationPipe` + `class-validator` |
| Error handling | ✅ `GraphQLError` with `extensions.code` |
| DataLoader | ✅ Per-request, no shared state |
| Pagination | ✅ All list queries |
| CRUD | ✅ Full User + Message CRUD |
