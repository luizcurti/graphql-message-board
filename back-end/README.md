# Back-end

Code-first GraphQL API — NestJS 10, TypeORM 0.3, SQLite.

## Run

```bash
npm install
npm run start:dev          # http://localhost:3333/graphql
npm run build && npm run start:prod
```

Migrations run automatically on boot. The database lives at `data/chatterbox.db`.

## Scripts

| Script | Purpose |
|---|---|
| `npm test` / `npm run test:cov` | Unit tests (`test:cov` enforces 100% coverage) |
| `npm run test:e2e` | E2E over HTTP + WebSocket against an in-memory DB |
| `npm run test:collection` | Postman collection (server must be running) |
| `npm run lint` / `npm run format` | ESLint / Prettier |
| `npm run typeorm -- migration:run` | TypeORM CLI (`migration:revert`, `migration:generate src/db/migrations/Name`) |

## Structure

```
src/
├── config/      TypeORM options + CLI DataSource
├── db/          entities, migrations, UserLoader (DataLoader)
├── services/    UserService, MessageService (business rules)
├── resolvers/   thin GraphQL resolvers, inputs, object types
├── common/      paginate()
├── pubsub.ts    messageAdded PubSub
└── main.ts      bootstrap, CORS, ValidationPipe
```

See [docs/architecture.md](../docs/architecture.md) and [docs/api.md](../docs/api.md).
