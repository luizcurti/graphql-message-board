import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import UserService from '../services/user.service';
import User from '../db/models/user.entity';
import UserInput, { UpdateUserInput, DeleteUserInput } from './input/user.input';
import { PaginationArgs } from './input/pagination.args';
import { PaginatedUsers } from './types/paginated-users.type';

@Resolver(() => User)
export default class UserResolver {
  constructor(private readonly userService: UserService) {}

  @Query(() => PaginatedUsers)
  public async getUsers(
    @Args() { page, limit }: PaginationArgs,
  ): Promise<PaginatedUsers> {
    return this.userService.findAll(page, limit);
  }

  @Query(() => User, { nullable: true })
  public async getUser(@Args('id') id: number): Promise<User | null> {
    return this.userService.findOne(id);
  }

  @Mutation(() => User)
  public async createOrLoginUser(
    @Args('data') input: UserInput,
  ): Promise<User> {
    return this.userService.createOrLogin(input.email);
  }

  @Mutation(() => User)
  public async updateUser(
    @Args('data') input: UpdateUserInput,
  ): Promise<User> {
    return this.userService.update(input.id, input.email);
  }

  @Mutation(() => User)
  public async deleteUser(
    @Args('data') input: DeleteUserInput,
  ): Promise<User> {
    return this.userService.remove(input.id);
  }
}
