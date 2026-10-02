import { gql } from '@apollo/client';

function loadApi(url?: string) {
  const original = process.env.REACT_APP_GRAPHQL_URL;
  if (url === undefined) delete process.env.REACT_APP_GRAPHQL_URL;
  else process.env.REACT_APP_GRAPHQL_URL = url;

  let api: typeof import('./api') | undefined;
  jest.isolateModules(() => {
    api = jest.requireActual<typeof import('./api')>('./api');
  });

  process.env.REACT_APP_GRAPHQL_URL = original;
  return api!;
}

describe('Apollo client config', () => {
  it('defaults to localhost:3333 over http and ws', () => {
    const api = loadApi();

    expect(api.GRAPHQL_URL).toBe('http://localhost:3333/graphql');
    expect(api.GRAPHQL_WS_URL).toBe('ws://localhost:3333/graphql');
  });

  it('derives a wss URL from an https REACT_APP_GRAPHQL_URL', () => {
    const api = loadApi('https://api.example.com/graphql');

    expect(api.GRAPHQL_URL).toBe('https://api.example.com/graphql');
    expect(api.GRAPHQL_WS_URL).toBe('wss://api.example.com/graphql');
  });

  it('exports a ready ApolloClient', () => {
    const api = loadApi();

    expect(api.default.link).toBeDefined();
    expect(api.default.cache).toBeDefined();
  });

  describe('isSubscription', () => {
    const { isSubscription } = loadApi();

    it('routes subscriptions to the WebSocket link', () => {
      expect(isSubscription({ query: gql`subscription { messageAdded { id } }` })).toBe(true);
    });

    it.each([
      ['queries', gql`query { getStats { users } }`],
      ['mutations', gql`mutation { deleteUser(data: { id: 1 }) { id } }`],
      ['fragment-only documents', gql`fragment F on User { id }`],
    ])('routes %s to the HTTP link', (_label, query) => {
      expect(isSubscription({ query })).toBe(false);
    });
  });
});
