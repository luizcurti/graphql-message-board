import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class Stats {
  @Field(() => Int, { description: 'Total number of users' })
  users: number;

  @Field(() => Int, { description: 'Total number of messages' })
  messages: number;
}
