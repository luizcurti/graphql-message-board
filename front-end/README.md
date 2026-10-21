# Front-end

React 18 SPA using Apollo Client (HTTP + `graphql-ws`) against the GraphQL API.

## Run

```bash
npm install
npm start                    # http://localhost:3000 (API must be on :3333)
npm test -- --watchAll=false
npm run test:cov             # enforces 100% coverage
npm run build                # static bundle in build/
```

Set `REACT_APP_GRAPHQL_URL` in `.env` to use another API (see [`.env.example`](.env.example)).

## Pages

- `/` — log in or register by e-mail.
- `/dashboard?id=<userId>` — paginated board: send, delete own messages, live updates.

## Structure

```
src/
├── graphql/     gql documents + types
├── hooks/       useAuth, useMessages (GraphQL + validation)
├── pages/       Home, Board (presentational)
├── services/    Apollo Client (split HTTP/WS link)
└── styles/      global styles
```

Unit tests mock Apollo with `MockedProvider`; real browser coverage lives in [`../e2e`](../e2e/README.md).
