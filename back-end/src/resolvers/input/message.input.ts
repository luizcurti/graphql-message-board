import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsPositive, MaxLength } from 'class-validator';

@InputType()
export default class MessageInput {
  @Field()
  @IsNotEmpty({ message: 'Message content cannot be empty' })
  @MaxLength(500, { message: 'Message content must be at most 500 characters' })
  readonly content: string;

  @Field()
  @IsPositive({ message: 'User ID must be a positive number' })
  readonly userId: number;
}

@InputType()
export class DeleteMessageInput {
  @Field()
  @IsPositive({ message: 'Message ID must be a positive number' })
  readonly id: number;

  @Field()
  @IsPositive({ message: 'User ID must be a positive number' })
  readonly userId: number;
}

@InputType()
export class UpdateMessageInput {
  @Field()
  @IsPositive({ message: 'Message ID must be a positive number' })
  readonly id: number;

  @Field()
  @IsPositive({ message: 'User ID must be a positive number' })
  readonly userId: number;

  @Field()
  @IsNotEmpty({ message: 'Message content cannot be empty' })
  @MaxLength(500, { message: 'Message content must be at most 500 characters' })
  readonly content: string;
}
