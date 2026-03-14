import { Test, TestingModule } from '@nestjs/testing';
import { GraphQLError } from 'graphql';
import MessageResolver, { pubSub } from './message.resolver';
import RepoService from '../repo.service';

describe('MessageResolver', () => {
  let resolver: MessageResolver;

  const mockUser = { id: 1, email: 'user@test.com', createdAt: new Date() };
  const mockMessage = {
    id: 1,
    content: 'Olá mundo',
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
        MessageResolver,
        { provide: RepoService, useValue: { messageRepo: mockMessageRepo } },
      ],
    }).compile();

    resolver = module.get<MessageResolver>(MessageResolver);
  });

  // ─── getMessages ───────────────────────────────────────────────────────────

  describe('getMessages', () => {
    it('deve retornar lista paginada de mensagens', async () => {
      mockMessageRepo.findAndCount.mockResolvedValue([[mockMessage], 1]);

      const result = await resolver.getMessages({ page: 1, limit: 10 });

      expect(result).toEqual({ items: [mockMessage], total: 1, page: 1, pages: 1 });
      expect(mockMessageRepo.findAndCount).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        order: { createdAt: 'DESC' },
      });
    });

    it('deve calcular skip corretamente na página 2', async () => {
      mockMessageRepo.findAndCount.mockResolvedValue([[], 1]);

      await resolver.getMessages({ page: 2, limit: 5 });

      expect(mockMessageRepo.findAndCount).toHaveBeenCalledWith({
        skip: 5,
        take: 5,
        order: { createdAt: 'DESC' },
      });
    });

    it('deve retornar pages=1 quando total é zero', async () => {
      mockMessageRepo.findAndCount.mockResolvedValue([[], 0]);

      const result = await resolver.getMessages({ page: 1, limit: 10 });

      expect(result.pages).toBe(1);
    });
  });

  // ─── getMessagesFromUser ───────────────────────────────────────────────────

  describe('getMessagesFromUser', () => {
    it('deve retornar mensagens filtradas por userId', async () => {
      mockMessageRepo.findAndCount.mockResolvedValue([[mockMessage], 1]);

      const result = await resolver.getMessagesFromUser(1, { page: 1, limit: 10 });

      expect(result.items).toEqual([mockMessage]);
      expect(mockMessageRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 1 } }),
      );
    });

    it('deve retornar lista vazia para userId sem mensagens', async () => {
      mockMessageRepo.findAndCount.mockResolvedValue([[], 0]);

      const result = await resolver.getMessagesFromUser(999, { page: 1, limit: 10 });

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  // ─── getMessage ────────────────────────────────────────────────────────────

  describe('getMessage', () => {
    it('deve retornar mensagem por id', async () => {
      mockMessageRepo.findOne.mockResolvedValue(mockMessage);

      const result = await resolver.getMessage(1);

      expect(result).toEqual(mockMessage);
      expect(mockMessageRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('deve retornar null se mensagem não encontrada', async () => {
      mockMessageRepo.findOne.mockResolvedValue(null);

      const result = await resolver.getMessage(999);

      expect(result).toBeNull();
    });
  });

  // ─── createMessage ─────────────────────────────────────────────────────────

  describe('createMessage', () => {
    it('deve criar mensagem e publicar evento', async () => {
      mockMessageRepo.create.mockReturnValue(mockMessage);
      mockMessageRepo.save.mockResolvedValue(mockMessage);
      const publishSpy = jest.spyOn(pubSub, 'publish').mockResolvedValue(undefined);

      const result = await resolver.createMessage({
        userId: 1,
        content: 'Olá mundo',
      });

      expect(mockMessageRepo.create).toHaveBeenCalledWith({
        userId: 1,
        content: 'Olá mundo',
      });
      expect(mockMessageRepo.save).toHaveBeenCalled();
      expect(publishSpy).toHaveBeenCalledWith('messageAdded', {
        messageAdded: mockMessage,
      });
      expect(result).toEqual(mockMessage);
    });
  });

  // ─── updateMessage ─────────────────────────────────────────────────────────

  describe('updateMessage', () => {
    it('deve atualizar conteúdo da mensagem', async () => {
      const updated = { ...mockMessage, content: 'Editado' };
      mockMessageRepo.findOne.mockResolvedValue({ ...mockMessage });
      mockMessageRepo.save.mockResolvedValue(updated);

      const result = await resolver.updateMessage({
        id: 1,
        userId: 1,
        content: 'Editado',
      });

      expect(result.content).toBe('Editado');
    });

    it('deve lançar GraphQLError se mensagem não encontrada', async () => {
      mockMessageRepo.findOne.mockResolvedValue(null);

      await expect(
        resolver.updateMessage({ id: 999, userId: 1, content: 'x' }),
      ).rejects.toThrow(GraphQLError);
    });

    it('deve lançar GraphQLError se userId não é o autor', async () => {
      mockMessageRepo.findOne.mockResolvedValue({ ...mockMessage, userId: 2 });

      await expect(
        resolver.updateMessage({ id: 1, userId: 1, content: 'x' }),
      ).rejects.toThrow(GraphQLError);
    });
  });

  // ─── deleteMessage ─────────────────────────────────────────────────────────

  describe('deleteMessage', () => {
    it('deve remover mensagem e retornar sua cópia', async () => {
      mockMessageRepo.findOne.mockResolvedValue(mockMessage);
      mockMessageRepo.remove.mockResolvedValue(undefined);

      const result = await resolver.deleteMessage({ id: 1, userId: 1 });

      expect(mockMessageRepo.remove).toHaveBeenCalledWith(mockMessage);
      expect(result).toEqual(mockMessage);
    });

    it('deve lançar GraphQLError se mensagem não existe', async () => {
      mockMessageRepo.findOne.mockResolvedValue(null);

      await expect(
        resolver.deleteMessage({ id: 999, userId: 1 }),
      ).rejects.toThrow(GraphQLError);
    });

    it('deve lançar GraphQLError se userId não é o autor', async () => {
      mockMessageRepo.findOne.mockResolvedValue({ ...mockMessage, userId: 2 });

      await expect(
        resolver.deleteMessage({ id: 1, userId: 1 }),
      ).rejects.toThrow(GraphQLError);
    });
  });

  // ─── ResolveField: user ────────────────────────────────────────────────────

  describe('getUser (ResolveField)', () => {
    it('deve usar UserLoader para carregar o usuário da mensagem', async () => {
      const mockLoader = { load: jest.fn().mockResolvedValue(mockUser) };

      const result = await resolver.getUser(mockMessage as any, {
        UserLoader: mockLoader,
      } as any);

      expect(mockLoader.load).toHaveBeenCalledWith(mockMessage.userId);
      expect(result).toEqual(mockUser);
    });
  });
});
