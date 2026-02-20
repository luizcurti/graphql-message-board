import { Module } from '@nestjs/common';
import { TypeOrmModule, getDataSourceToken } from '@nestjs/typeorm';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { DataSource } from 'typeorm';

import { AppController } from './app.controller';
import ormOptions from './config/orm';
import RepoModule from './repo.module';
import UserResolver from './resolvers/user.resolver';
import MessageResolver from './resolvers/message.resolver';
import { createContext } from './db/loaders';

const gqlImports = [UserResolver, MessageResolver];

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
        installSubscriptionHandlers: true,
        context: createContext(dataSource),
      }),
    }),
  ],
  controllers: [AppController],
})
export class AppModule {}
