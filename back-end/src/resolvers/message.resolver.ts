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
import MessageService from '../services/message.service';
import Message from '../db/models/message.entity';
import MessageInput, { DeleteMessageInput, UpdateMessageInput } from './input/message.input';
import User from '../db/models/user.entity';
import { GQLContext } from '../db/loaders';
import { PaginationArgs, GetMessagesFromUserArgs } from './input/pagination.args';
import { PaginatedMessages } from './types/paginated-messages.type';
import { pubSub } from '../pubsub';

@Resolver(() => Message)
export default class MessageResolver {
  constructor(private readonly messageService: MessageService) {}

  @Query(() => PaginatedMessages)
  public async getMessages(
    @Args() { page, limit }: PaginationArgs,
  ): Promise<PaginatedMessages> {
    return this.messageService.findAll(page, limit);
  }

  @Query(() => PaginatedMessages)
  public async getMessagesFromUser(
    @Args() { userId, page, limit }: GetMessagesFromUserArgs,
  ): Promise<PaginatedMessages> {
    return this.messageService.findByUser(userId, page, limit);
  }

  @Query(() => Message, { nullable: true })
  public async getMessage(@Args('id') id: number): Promise<Message | null> {
    return this.messageService.findOne(id);
  }

  @Mutation(() => Message)
  public async createMessage(
    @Args('data') input: MessageInput,
  ): Promise<Message> {
    return this.messageService.create(input.userId, input.content);
  }

  @Mutation(() => Message)
  public async updateMessage(
    @Args('data') input: UpdateMessageInput,
  ): Promise<Message> {
    return this.messageService.update(input.id, input.userId, input.content);
  }

  @Mutation(() => Message)
  public async deleteMessage(
    @Args('data') input: DeleteMessageInput,
  ): Promise<Message> {
    return this.messageService.remove(input.id, input.userId);
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
