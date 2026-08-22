import { Injectable } from '@nestjs/common';
import { GraphQLError } from 'graphql';
import RepoService from '../repo.service';
import Message from '../db/models/message.entity';
import { paginate, Paginated } from '../common/paginate';
import { pubSub } from '../pubsub';

@Injectable()
export default class MessageService {
  public constructor(private readonly repoService: RepoService) {}

  public async findAll(page: number, limit: number): Promise<Paginated<Message>> {
    const [items, total] = await this.repoService.messageRepo.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return paginate(items, total, page, limit);
  }

  public async findByUser(
    userId: number,
    page: number,
    limit: number,
  ): Promise<Paginated<Message>> {
    const [items, total] = await this.repoService.messageRepo.findAndCount({
      where: { userId },
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return paginate(items, total, page, limit);
  }

  public async findOne(id: number): Promise<Message | null> {
    return this.repoService.messageRepo.findOne({ where: { id } });
  }

  public async create(userId: number, content: string): Promise<Message> {
    const message = this.repoService.messageRepo.create({ userId, content });
    const saved = await this.repoService.messageRepo.save(message);

    pubSub.publish('messageAdded', { messageAdded: saved });

    return saved;
  }

  public async update(id: number, userId: number, content: string): Promise<Message> {
    const message = await this.findMessageOwnedBy(id, userId, 'You are not the author of this message');

    message.content = content;
    return this.repoService.messageRepo.save(message);
  }

  public async remove(id: number, userId: number): Promise<Message> {
    const message = await this.repoService.messageRepo.findOne({ where: { id } });

    if (!message || message.userId !== userId) {
      throw new GraphQLError(
        'Message does not exist or you are not the message author',
        { extensions: { code: 'FORBIDDEN' } },
      );
    }

    const copy = { ...message };
    await this.repoService.messageRepo.remove(message);
    return copy;
  }

  private async findMessageOwnedBy(
    id: number,
    userId: number,
    forbiddenMessage: string,
  ): Promise<Message> {
    const message = await this.repoService.messageRepo.findOne({ where: { id } });

    if (!message) {
      throw new GraphQLError('Message not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    if (message.userId !== userId) {
      throw new GraphQLError(forbiddenMessage, {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    return message;
  }
}
