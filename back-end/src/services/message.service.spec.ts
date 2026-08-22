import { Test, TestingModule } from '@nestjs/testing';
import { GraphQLError } from 'graphql';
import MessageService from './message.service';
import RepoService from '../repo.service';
import { pubSub } from '../pubsub';

describe('MessageService', () => {
  let service: MessageService;

  const mockMessage = {
    id: 1,
    content: 'Hello world',
    userId: 1,
    createdAt: new Date(),
  };

  const mockMessageRepo = {
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageService,
        { provide: RepoService, useValue: { messageRepo: mockMessageRepo } },
      ],
    }).compile();

    service = module.get<MessageService>(MessageService);
  });

  // ─── findAll ───────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns a paginated list of messages', async () => {
      mockMessageRepo.findAndCount.mockResolvedValue([[mockMessage], 1]);

      const result = await service.findAll(1, 10);

      expect(result).toEqual({ items: [mockMessage], total: 1, page: 1, pages: 1 });
      expect(mockMessageRepo.findAndCount).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        order: { createdAt: 'DESC' },
      });
    });

    it('computes skip correctly for page 2', async () => {
      mockMessageRepo.findAndCount.mockResolvedValue([[], 1]);

      await service.findAll(2, 5);

      expect(mockMessageRepo.findAndCount).toHaveBeenCalledWith({
        skip: 5,
        take: 5,
        order: { createdAt: 'DESC' },
      });
    });

    it('returns pages=1 when total is zero', async () => {
      mockMessageRepo.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.findAll(1, 10);

      expect(result.pages).toBe(1);
    });
  });

  // ─── findByUser ────────────────────────────────────────────────────────────

  describe('findByUser', () => {
    it('returns messages filtered by userId', async () => {
      mockMessageRepo.findAndCount.mockResolvedValue([[mockMessage], 1]);

      const result = await service.findByUser(1, 1, 10);

      expect(result.items).toEqual([mockMessage]);
      expect(mockMessageRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 1 } }),
      );
    });

    it('returns an empty list for a userId with no messages', async () => {
      mockMessageRepo.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.findByUser(999, 1, 10);

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  // ─── findOne ───────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('returns a message by id', async () => {
      mockMessageRepo.findOne.mockResolvedValue(mockMessage);

      const result = await service.findOne(1);

      expect(result).toEqual(mockMessage);
      expect(mockMessageRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('returns null when the message is not found', async () => {
      mockMessageRepo.findOne.mockResolvedValue(null);

      const result = await service.findOne(999);

      expect(result).toBeNull();
    });
  });

  // ─── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates a message and publishes the messageAdded event', async () => {
      mockMessageRepo.create.mockReturnValue(mockMessage);
      mockMessageRepo.save.mockResolvedValue(mockMessage);
      const publishSpy = jest.spyOn(pubSub, 'publish').mockResolvedValue(undefined);

      const result = await service.create(1, 'Hello world');

      expect(mockMessageRepo.create).toHaveBeenCalledWith({
        userId: 1,
        content: 'Hello world',
      });
      expect(mockMessageRepo.save).toHaveBeenCalled();
      expect(publishSpy).toHaveBeenCalledWith('messageAdded', {
        messageAdded: mockMessage,
      });
      expect(result).toEqual(mockMessage);
    });
  });

  // ─── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('updates the message content', async () => {
      const updated = { ...mockMessage, content: 'Edited' };
      mockMessageRepo.findOne.mockResolvedValue({ ...mockMessage });
      mockMessageRepo.save.mockResolvedValue(updated);

      const result = await service.update(1, 1, 'Edited');

      expect(result.content).toBe('Edited');
    });

    it('throws a GraphQLError when the message is not found', async () => {
      mockMessageRepo.findOne.mockResolvedValue(null);

      await expect(service.update(999, 1, 'x')).rejects.toThrow(GraphQLError);
    });

    it('throws a GraphQLError when userId is not the author', async () => {
      mockMessageRepo.findOne.mockResolvedValue({ ...mockMessage, userId: 2 });

      await expect(service.update(1, 1, 'x')).rejects.toThrow(GraphQLError);
    });
  });

  // ─── remove ────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('removes the message and returns a copy of it', async () => {
      mockMessageRepo.findOne.mockResolvedValue(mockMessage);
      mockMessageRepo.remove.mockResolvedValue(undefined);

      const result = await service.remove(1, 1);

      expect(mockMessageRepo.remove).toHaveBeenCalledWith(mockMessage);
      expect(result).toEqual(mockMessage);
    });

    it('throws a GraphQLError when the message does not exist', async () => {
      mockMessageRepo.findOne.mockResolvedValue(null);

      await expect(service.remove(999, 1)).rejects.toThrow(GraphQLError);
    });

    it('throws a GraphQLError when userId is not the author', async () => {
      mockMessageRepo.findOne.mockResolvedValue({ ...mockMessage, userId: 2 });

      await expect(service.remove(1, 1)).rejects.toThrow(GraphQLError);
    });
  });
});
