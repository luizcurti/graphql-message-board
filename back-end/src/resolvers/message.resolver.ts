import {
  Args,
  Mutation,
  Query,
  Resolver,
  Parent,
  ResolveField,
  Subscription,
  Context,
} from '@nestjs/graphql';
import { PubSub } from 'graphql-subscriptions';
import { GraphQLError } from 'graphql';
import RepoService from '../repo.service';
import Message from '../db/models/message.entity';
import MessageInput, { DeleteMessageInput, UpdateMessageInput } from './input/message.input';
import User from '../db/models/user.entity';
import { GQLContext } from '../db/loaders';
import { PaginationArgs } from './input/pagination.args';
import { PaginatedMessages } from './types/paginated-messages.type';

export const pubSub = new PubSub();

@Resolver(() => Message)
export default class MessageResolver {
  constructor(private readonly repoService: RepoService) {}

  @Query(() => PaginatedMessages)
  public async getMessages(
    @Args() { page, limit }: PaginationArgs,
  ): Promise<PaginatedMessages> {
    const [items, total] = await this.repoService.messageRepo.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { items, total, page, pages: Math.ceil(total / limit) || 1 };
  }

  @Query(() => PaginatedMessages)
  public async getMessagesFromUser(
    @Args('userId') userId: number,
    @Args() { page, limit }: PaginationArgs,
  ): Promise<PaginatedMessages> {
    const [items, total] = await this.repoService.messageRepo.findAndCount({
      where: { userId },
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { items, total, page, pages: Math.ceil(total / limit) || 1 };
  }

  @Query(() => Message, { nullable: true })
  public async getMessage(@Args('id') id: number): Promise<Message> {
    return this.repoService.messageRepo.findOne({ where: { id } });
  }

  @Mutation(() => Message)
  public async createMessage(
    @Args('data') input: MessageInput,
  ): Promise<Message> {
    const message = this.repoService.messageRepo.create({
      userId: input.userId,
      content: input.content,
    });

    const response = await this.repoService.messageRepo.save(message);

    pubSub.publish('messageAdded', { messageAdded: message });

    return response;
  }

  @Mutation(() => Message)
  public async updateMessage(
    @Args('data') input: UpdateMessageInput,
  ): Promise<Message> {
    const message = await this.repoService.messageRepo.findOne({
      where: { id: input.id },
    });

    if (!message) {
      throw new GraphQLError('Message not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    if (message.userId !== input.userId) {
      throw new GraphQLError('You are not the author of this message', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    message.content = input.content;
    return this.repoService.messageRepo.save(message);
  }

  @Mutation(() => Message)
  public async deleteMessage(
    @Args('data') input: DeleteMessageInput,
  ): Promise<Message> {
    const message = await this.repoService.messageRepo.findOne({ where: { id: input.id } });

    if (!message || message.userId !== input.userId) {
      throw new GraphQLError(
        'Message does not exist or you are not the message author',
        { extensions: { code: 'FORBIDDEN' } },
      );
    }

    const copy = { ...message };

    await this.repoService.messageRepo.remove(message);

    return copy;
  }

  @Subscription(() => Message)
  messageAdded() {
    return pubSub.asyncIterator('messageAdded');
  }

  @ResolveField(() => User, { name: 'user' })
  public async getUser(
    @Parent() parent: Message,
    @Context() { UserLoader }: GQLContext,
  ): Promise<User> {
    return UserLoader.load(parent.userId);
  }
}
