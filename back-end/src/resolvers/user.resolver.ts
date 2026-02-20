import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';
import RepoService from '../repo.service';
import User from '../db/models/user.entity';
import UserInput, { UpdateUserInput, DeleteUserInput } from './input/user.input';
import { PaginationArgs } from './input/pagination.args';
import { PaginatedUsers } from './types/paginated-users.type';

@Resolver(() => User)
export default class UserResolver {
  constructor(private readonly repoService: RepoService) {}

  @Query(() => PaginatedUsers)
  public async getUsers(
    @Args() { page, limit }: PaginationArgs,
  ): Promise<PaginatedUsers> {
    const [items, total] = await this.repoService.userRepo.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { items, total, page, pages: Math.ceil(total / limit) || 1 };
  }

  @Query(() => User, { nullable: true })
  public async getUser(@Args('id') id: number): Promise<User> {
    return this.repoService.userRepo.findOne({ where: { id } });
  }

  @Mutation(() => User)
  public async createOrLoginUser(
    @Args('data') input: UserInput,
  ): Promise<User> {
    let user = await this.repoService.userRepo.findOne({
      where: { email: input.email.toLowerCase().trim() },
    });

    if (!user) {
      user = this.repoService.userRepo.create({
        email: input.email.toLowerCase().trim(),
      });

      await this.repoService.userRepo.save(user);
    }

    return user;
  }

  @Mutation(() => User)
  public async updateUser(
    @Args('data') input: UpdateUserInput,
  ): Promise<User> {
    const user = await this.repoService.userRepo.findOne({
      where: { id: input.id },
    });

    if (!user) {
      throw new GraphQLError('User not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    const emailAlreadyInUse = await this.repoService.userRepo.findOne({
      where: { email: input.email.toLowerCase().trim() },
    });

    if (emailAlreadyInUse && emailAlreadyInUse.id !== input.id) {
      throw new GraphQLError('Email is already in use by another account', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    user.email = input.email.toLowerCase().trim();
    return this.repoService.userRepo.save(user);
  }

  @Mutation(() => User)
  public async deleteUser(
    @Args('data') input: DeleteUserInput,
  ): Promise<User> {
    const user = await this.repoService.userRepo.findOne({
      where: { id: input.id },
    });

    if (!user) {
      throw new GraphQLError('User not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    const copy = { ...user };
    await this.repoService.userRepo.remove(user);
    return copy;
  }
}
