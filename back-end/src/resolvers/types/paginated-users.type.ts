import { ObjectType, Field, Int } from '@nestjs/graphql';
import User from '../../db/models/user.entity';

@ObjectType()
export class PaginatedUsers {
  @Field(() => [User])
  items: User[];

  @Field(() => Int, { description: 'Total number of users' })
  total: number;

  @Field(() => Int, { description: 'Current page' })
  page: number;

  @Field(() => Int, { description: 'Total number of pages' })
  pages: number;
}
