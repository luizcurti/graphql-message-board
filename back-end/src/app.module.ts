import { Module } from '@nestjs/common';
import { TypeOrmModule, getDataSourceToken } from '@nestjs/typeorm';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { DataSource } from 'typeorm';

import ormOptions from './config/orm';
import RepoModule from './repo.module';
import UserResolver from './resolvers/user.resolver';
import MessageResolver from './resolvers/message.resolver';
import StatsResolver from './resolvers/stats.resolver';
import { createContext } from './db/loaders';

const gqlImports = [UserResolver, MessageResolver, StatsResolver];

@Module({
  imports: [
    TypeOrmModule.forRoot(ormOptions),
    RepoModule,
    ...gqlImports,
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      inject: [getDataSourceToken()],
      useFactory: (dataSource: DataSource) => ({
        autoSchemaFile: 'schema.gql',
        playground: process.env.NODE_ENV !== 'production',
        subscriptions: {
          'graphql-ws': true,
        },
        context: createContext(dataSource),
      }),
    }),
  ],
})
export class AppModule {}
