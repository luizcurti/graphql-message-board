import { ApolloClient, InMemoryCache, createHttpLink, split } from '@apollo/client';
import { getMainDefinition } from '@apollo/client/utilities';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';

const GRAPHQL_URL = process.env.REACT_APP_GRAPHQL_URL || 'http://localhost:3333/graphql';
const GRAPHQL_WS_URL = GRAPHQL_URL.replace(/^http/, 'ws');

const httpLink = createHttpLink({
  uri: GRAPHQL_URL,
});

const wsLink = new GraphQLWsLink(createClient({ url: GRAPHQL_WS_URL }));

const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return definition.kind === 'OperationDefinition' && definition.operation === 'subscription';
  },
  wsLink,
  httpLink,
);

const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
});

export default client;
