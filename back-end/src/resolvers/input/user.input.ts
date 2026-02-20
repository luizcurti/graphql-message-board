import { Field, InputType } from '@nestjs/graphql';
import { IsEmail, IsNotEmpty, IsPositive } from 'class-validator';

@InputType()
export default class UserInput {
  @Field()
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'Email is required' })
  readonly email: string;
}

@InputType()
export class UpdateUserInput {
  @Field()
  @IsPositive({ message: 'User ID must be a positive number' })
  readonly id: number;

  @Field()
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'Email is required' })
  readonly email: string;
}

@InputType()
export class DeleteUserInput {
  @Field()
  @IsPositive({ message: 'User ID must be a positive number' })
  readonly id: number;
}
