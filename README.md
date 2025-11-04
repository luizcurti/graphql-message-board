<h1 align="center">
NestJS + TypeORM + GraphQL + React
</h1>

<p align="center">Full-stack GraphQL application with NestJS backend and React frontend.</p>

## 🚀 Technologies

### Backend
- **NestJS** v10 - Node.js framework
- **GraphQL** v16 - Query language with Apollo Server
- **TypeORM** v0.3 - TypeScript ORM
- **SQLite** - Database
- **DataLoader** - Query optimization (N+1 problem)
- **TypeScript** v5.3

### Frontend
- **React** v18 - UI library
- **Apollo Client** v3 - GraphQL client
- **React Router** v6 - Routing
- **Styled Components** v6 - CSS-in-JS
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

- ✅ User authentication (create/login with email)
- ✅ Message CRUD operations
- ✅ GraphQL queries, mutations, and subscriptions
- ✅ Real-time updates with GraphQL subscriptions
- ✅ DataLoader for optimized database queries
- ✅ Fully typed with TypeScript
- ✅ Modern React with hooks
- ✅ Responsive UI with Styled Components

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
    user {
      email
    }
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

# Create message
mutation {
  createMessage(data: { userId: 1, content: "Hello World!" }) {
    id
    content
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

## 🔄 Recent Updates

### Backend
- ✅ Upgraded to NestJS 10+
- ✅ Upgraded TypeORM to v0.3
- ✅ Upgraded GraphQL to v16
- ✅ Upgraded TypeScript to v5.3
- ✅ **Reduced vulnerabilities from 75 to 0**
- ✅ Fixed all lint errors
- ✅ Updated tests configuration
- ✅ Improved README documentation

### Frontend
- ✅ Upgraded React 16 → 18
- ✅ Upgraded Apollo Client 2 → 3
- ✅ Upgraded React Router 5 → 6
- ✅ Upgraded TypeScript 3.7 → 4.9
- ✅ **Reduced vulnerabilities from 172 to 9**
- ✅ Migrated to React 18 APIs
- ✅ Updated all imports and hooks
- ✅ Fixed build errors

## ✅ Project Status

- ✅ **Backend**: 0 vulnerabilities
- ✅ **Frontend**: 9 vulnerabilities (low/moderate, dev dependencies only)
- ✅ All builds passing
- ✅ TypeScript compilation without errors
- ✅ Ready for production deployment

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