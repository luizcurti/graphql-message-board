# Back-End - NestJS + GraphQL + TypeORM

GraphQL API built with NestJS, TypeORM and SQLite.

## 🚀 Technologies

- **NestJS** v10 - Node.js Framework
- **GraphQL** v16 - GraphQL API with Apollo Server
- **TypeORM** v0.3 - TypeScript ORM
- **SQLite** - Database
- **DataLoader** - Query optimization (N+1 problem)
- **TypeScript** v5.3
- **Jest** - Unit and E2E testing

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

The GraphQL schema is automatically generated in `schema.gql` from the resolvers.

### Main Queries

```graphql
# Get all users
query {
  getUsers {
    id
    email
    createdAt
  }
}

# Get all messages
query {
  getMessages {
    id
    content
    userId
    user {
      email
    }
  }
}
```

### Main Mutations

```graphql
# Create/Login user
mutation {
  createOrLoginUser(data: { email: "user@example.com" }) {
    id
    email
  }
}

# Create message
mutation {
  createMessage(data: { userId: 1, content: "Hello!" }) {
    id
    content
  }
}

# Delete message
mutation {
  deleteMessage(data: { id: 1, userId: 1 }) {
    id
  }
}
```

### Subscriptions

```graphql
# Listen for new messages
subscription {
  messageAdded {
    id
    content
    user {
      email
    }
  }
}
```

## 📁 Project Structure

```
src/
├── config/          # Configurations (TypeORM)
├── db/
│   ├── loaders/     # DataLoaders for optimization
│   ├── migrations/  # Database migrations
│   └── models/      # Entities (User, Message)
├── resolvers/       # GraphQL Resolvers
│   └── input/       # Input Types
├── app.module.ts    # Main module
├── repo.module.ts   # Repository module
├── repo.service.ts  # Repository service
└── main.ts          # Application bootstrap
```

## 🔧 Configuration

The SQLite database is configured in `src/config/orm.ts`:
- **Database**: `data/rocketseat.db`
- **Logging**: Enabled for development
- **Entities**: Automatically loaded from `src/db/models`
- **Migrations**: Loaded from `src/db/migrations`

## ✅ Project Status

- ✅ 0 security vulnerabilities
- ✅ Lint configured and passing
- ✅ Unit tests passing
- ✅ Build without errors
- ✅ TypeScript 5.3
- ✅ NestJS 10+ with latest updates
