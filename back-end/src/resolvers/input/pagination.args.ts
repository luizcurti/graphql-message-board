import { ArgsType, Field, Int } from '@nestjs/graphql';
import { IsInt, Min, Max } from 'class-validator';

@ArgsType()
export class PaginationArgs {
  @Field(() => Int, { defaultValue: 1, description: 'Page number (1-based)' })
  @IsInt()
  @Min(1)
  page: number = 1;

  @Field(() => Int, {
    defaultValue: 20,
    description: 'Number of items per page (max 100)',
  })
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
