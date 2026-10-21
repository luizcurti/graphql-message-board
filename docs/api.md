# GraphQL API

Endpoint: `http://localhost:3333/graphql` (HTTP for queries/mutations, WebSocket via `graphql-ws` for subscriptions). The schema is generated from code into [`back-end/schema.gql`](../back-end/schema.gql).

## Queries

```graphql
query { getStats { users messages } }
query { getUser(id: 1) { id email } }
query { getUsers(page: 1, limit: 20) { items { id email createdAt } total page pages } }
query { getMessage(id: 1) { id content } }
query { getMessages(page: 1, limit: 20) { items { id content user { email } } total page pages } }
query { getMessagesFromUser(userId: 1, page: 1, limit: 10) { items { id content } total pages } }
```

## Mutations

```graphql
mutation { createOrLoginUser(data: { email: "user@example.com" }) { id email } }
mutation { updateUser(data: { id: 1, email: "new@example.com" }) { id email } }
mutation { deleteUser(data: { id: 1 }) { id } }
mutation { createMessage(data: { userId: 1, content: "Hello!" }) { id content } }
mutation { updateMessage(data: { id: 1, userId: 1, content: "Updated" }) { id content } }
mutation { deleteMessage(data: { id: 1, userId: 1 }) { id } }
```

`updateMessage` / `deleteMessage` only succeed for the message author.

## Subscriptions

```graphql
subscription { messageAdded { id content user { email } } }
```

## Errors

| `extensions.code` | When |
|---|---|
| `BAD_USER_INPUT` | Validation failure (message lists every failed rule, e.g. `Invalid email format`), invalid variables, email already in use |
| `NOT_FOUND` | User or message does not exist (including `createMessage` for an unknown user) |
| `FORBIDDEN` | Caller is not the message author |
| `GRAPHQL_VALIDATION_FAILED` / `GRAPHQL_PARSE_FAILED` | Unknown field, wrong literal type, syntax error (HTTP 400) |

## Input rules

| Input | Rule |
|---|---|
| `email` | Valid e-mail, required; stored lowercase |
| `id`, `userId` | Positive number |
| `content` | 1–500 characters |
| `page` / `limit` | Integers; `page ≥ 1`, `1 ≤ limit ≤ 100` (defaults 1 / 20) |

Lists are ordered newest first (`created_at DESC, id DESC`).

## Postman

[`postman/`](postman) covers every query and mutation with happy and sad paths (59 requests). Run it with `npm run test:collection` from `back-end/`.
