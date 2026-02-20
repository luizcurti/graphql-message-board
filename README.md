<h1 align="center">
NestJS + TypeORM + GraphQL + React
</h1>

<p align="center">Full-stack GraphQL application with NestJS backend and React frontend.</p>

> **Status:** Production-ready — all mutations implemented, input validation, pagination, GraphQL error codes, and per-request DataLoader context.

## 🚀 Technologies

### Backend
- **NestJS** v10 — Node.js framework
- **GraphQL** v16 — Code-first schema with Apollo Server
- **TypeORM** v0.3 — TypeScript ORM (modern DataSource API)
- **SQLite** — Lightweight relational database
- **DataLoader** — Per-request batch loading (N+1 prevention)
- **class-validator + class-transformer** — Input validation via `ValidationPipe`
- **TypeScript** v5.3

### Frontend
- **React** v18 — UI library
- **Apollo Client** v3 — GraphQL client with `InMemoryCache`
- **React Router** v6 — Client-side routing
- **Styled Components** v6 — CSS-in-JS
- **TypeScript** v4.9

## 📦 Installation

```bash
# Clone this repository
git clone https://github.com/luizcurti/nestjs-graphql.git
cd nestjs-graphql

# Install backend dependencies
cd back-end
npm install

# Install frontend dependencies
cd ../front-end
npm install
```

## 🏃 Running the application

```bash
# Terminal 1 - Start backend (development mode)
cd back-end
npm run start:dev

# Terminal 2 - Start frontend
cd front-end
npm start
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3333
- **GraphQL Playground**: http://localhost:3333/graphql

## 🔧 Features

- ✅ User create/login by email
- ✅ Full Message CRUD — `createMessage`, `updateMessage`, `deleteMessage` (owner-only)
- ✅ Full User CRUD — `updateUser`, `deleteUser`
- ✅ Paginated queries — `getUsers`, `getMessages`, `getMessagesFromUser` (page + limit)
- ✅ GraphQL queries, mutations, and subscriptions (`messageAdded`)
- ✅ DataLoader per request — zero N+1 queries
- ✅ Global `ValidationPipe` with `class-validator` decorators on every InputType
- ✅ Structured `GraphQLError` responses with `extensions.code` (NOT_FOUND, FORBIDDEN, BAD_USER_INPUT)
- ✅ Playground enabled only when `NODE_ENV !== 'production'`
- ✅ Fully typed with TypeScript end-to-end

## 📁 Project Structure

```
.
├── back-end/          # NestJS GraphQL API
│   ├── src/
│   │   ├── config/    # Database configuration
│   │   ├── db/        # Entities, migrations, loaders
│   │   ├── resolvers/ # GraphQL resolvers
│   │   └── ...
│   └── data/          # SQLite database
│
└── front-end/         # React application
    ├── src/
    │   ├── pages/     # Home, Dashboard
    │   ├── services/  # Apollo Client setup
    │   └── ...
    └── public/
```

## 🧪 Testing

```bash
# Backend tests
cd back-end
npm test              # Unit tests
npm run test:e2e      # E2E tests
npm run test:cov      # Coverage

# Backend lint
npm run lint

# Frontend tests
cd front-end
npm test
```

## 📊 GraphQL Examples

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

# Paginated messages
query {
  getMessages(page: 1, limit: 20) {
    items {
      id
      content
      user { email }
    }
    total
    page
    pages
  }
}

# Messages by user (paginated)
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
mutation {
  createOrLoginUser(data: { email: "user@example.com" }) {
    id
    email
  }
}

# Update user
mutation {
  updateUser(data: { id: 1, email: "new@example.com" }) {
    id
    email
  }
}

# Delete user
mutation {
  deleteUser(data: { id: 1 }) {
    id
  }
}

# Create message
mutation {
  createMessage(data: { userId: 1, content: "Hello World!" }) {
    id
    content
  }
}

# Update message (owner only)
mutation {
  updateMessage(data: { id: 1, userId: 1, content: "Updated content" }) {
    id
    content
  }
}

# Delete message (owner only)
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
    user { email }
  }
}
```

## ✅ Project Status

| Area | Status |
|---|---|
| Backend build | ✅ Compiles without errors |
| Frontend build | ✅ Compiles without errors |
| Unit tests | ✅ Passing |
| Security | ✅ 0 backend vulnerabilities / 9 frontend (low/moderate, dev only) |
| Input validation | ✅ `ValidationPipe` + `class-validator` on all inputs |
| Error handling | ✅ `GraphQLError` with `extensions.code` on all resolvers |
| DataLoader | ✅ Per-request context (no shared state between requests) |
| Pagination | ✅ All list queries paginated |
| CRUD completeness | ✅ Full CRUD for User and Message |

## 📚 Documentation

For detailed documentation, see:
- [Backend README](./back-end/README.md)
- [Frontend README](./front-end/README.md)

## 🚀 Deployment

### Backend
```bash
cd back-end
npm run build
npm run start:prod
```

### Frontend
```bash
cd front-end
npm run build
# Deploy the 'build' folder to any static hosting service
```