import { ObjectType, Field, Int } from '@nestjs/graphql';
import Message from '../../db/models/message.entity';

@ObjectType()
export class PaginatedMessages {
  @Field(() => [Message])
  items: Message[];

  @Field(() => Int, { description: 'Total number of messages' })
  total: number;

  @Field(() => Int, { description: 'Current page' })
  page: number;

  @Field(() => Int, { description: 'Total number of pages' })
  pages: number;
}
