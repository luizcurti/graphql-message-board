import * as fs from 'fs';
import * as path from 'path';
import { Test } from '@nestjs/testing';
import { GraphQLSchemaBuilderModule, GraphQLSchemaFactory } from '@nestjs/graphql';
import { GraphQLSchema, buildSchema, lexicographicSortSchema, printSchema } from 'graphql';
import UserResolver from './resolvers/user.resolver';
import MessageResolver from './resolvers/message.resolver';
import StatsResolver from './resolvers/stats.resolver';

const normalize = (sdl: string) => printSchema(lexicographicSortSchema(buildSchema(sdl)));

describe('GraphQL schema', () => {
  let schema: GraphQLSchema;
  let sdl: string;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [GraphQLSchemaBuilderModule],
    }).compile();
    await module.init();

    const factory = module.get(GraphQLSchemaFactory);
    schema = await factory.create([UserResolver, MessageResolver, StatsResolver]);
    sdl = printSchema(schema);
  });

  it('matches the committed schema.gql', () => {
    const committed = fs.readFileSync(path.resolve(__dirname, '..', 'schema.gql'), 'utf8');

    expect(normalize(sdl)).toBe(normalize(committed));
  });

  it.each([
    'getStats: Stats!',
    'getUser(id: Float!): User',
    'getMessage(id: Float!): Message',
    'createOrLoginUser(data: UserInput!): User!',
    'updateUser(data: UpdateUserInput!): User!',
    'deleteUser(data: DeleteUserInput!): User!',
    'createMessage(data: MessageInput!): Message!',
    'updateMessage(data: UpdateMessageInput!): Message!',
    'deleteMessage(data: DeleteMessageInput!): Message!',
    'messageAdded: Message!',
    'user: User!',
    'items: [Message!]!',
    'items: [User!]!',
  ])('exposes %s', field => {
    expect(sdl).toContain(field);
  });

  it.each([
    ['getUsers', 'PaginatedUsers!', []],
    ['getMessages', 'PaginatedMessages!', []],
    ['getMessagesFromUser', 'PaginatedMessages!', ['userId: Float!']],
  ])('%s is paginated (page = 1, limit = 20)', (name, type, extra) => {
    const field = schema.getQueryType()!.getFields()[name as string];

    expect(String(field.type)).toBe(type);
    expect(field.args.map(a => `${a.name}: ${a.type}`)).toEqual([
      'page: Int!',
      'limit: Int!',
      ...(extra as string[]),
    ]);
    expect(field.args.slice(0, 2).map(a => a.defaultValue)).toEqual([1, 20]);
  });
});
