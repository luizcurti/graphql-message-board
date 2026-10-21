import { ApolloClient, InMemoryCache, Operation, createHttpLink, split } from '@apollo/client';
import { getMainDefinition } from '@apollo/client/utilities';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';

export const GRAPHQL_URL = process.env.REACT_APP_GRAPHQL_URL || 'http://localhost:3333/graphql';
export const GRAPHQL_WS_URL = GRAPHQL_URL.replace(/^http/, 'ws');

// Subscriptions go over WebSocket; everything else over HTTP.
export function isSubscription({ query }: Pick<Operation, 'query'>) {
  const definition = getMainDefinition(query);
  return definition.kind === 'OperationDefinition' && definition.operation === 'subscription';
}

const httpLink = createHttpLink({ uri: GRAPHQL_URL });

const wsLink = new GraphQLWsLink(createClient({ url: GRAPHQL_WS_URL }));

const client = new ApolloClient({
  link: split(isSubscription, wsLink, httpLink),
  cache: new InMemoryCache(),
});

export default client;
