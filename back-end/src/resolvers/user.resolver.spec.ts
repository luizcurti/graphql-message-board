import { Test, TestingModule } from '@nestjs/testing';
import { GraphQLError } from 'graphql';
import UserResolver from './user.resolver';
import RepoService from '../repo.service';

describe('UserResolver', () => {
  let resolver: UserResolver;

  const mockUser = { id: 1, email: 'user@test.com', createdAt: new Date() };

  const mockUserRepo = {
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
        UserResolver,
        { provide: RepoService, useValue: { userRepo: mockUserRepo } },
      ],
    }).compile();

    resolver = module.get<UserResolver>(UserResolver);
  });

  // ─── getUsers ──────────────────────────────────────────────────────────────

  describe('getUsers', () => {
    it('deve retornar lista paginada de usuários', async () => {
      mockUserRepo.findAndCount.mockResolvedValue([[mockUser], 1]);

      const result = await resolver.getUsers({ page: 1, limit: 10 });

      expect(result).toEqual({ items: [mockUser], total: 1, page: 1, pages: 1 });
      expect(mockUserRepo.findAndCount).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        order: { createdAt: 'DESC' },
      });
    });

    it('deve calcular skip corretamente na página 2', async () => {
      mockUserRepo.findAndCount.mockResolvedValue([[], 5]);

      await resolver.getUsers({ page: 2, limit: 3 });

      expect(mockUserRepo.findAndCount).toHaveBeenCalledWith({
        skip: 3,
        take: 3,
        order: { createdAt: 'DESC' },
      });
    });

    it('deve retornar pages=1 quando total é zero', async () => {
      mockUserRepo.findAndCount.mockResolvedValue([[], 0]);

      const result = await resolver.getUsers({ page: 1, limit: 10 });

      expect(result.pages).toBe(1);
    });
  });

  // ─── getUser ───────────────────────────────────────────────────────────────

  describe('getUser', () => {
    it('deve retornar usuário por id', async () => {
      mockUserRepo.findOne.mockResolvedValue(mockUser);

      const result = await resolver.getUser(1);

      expect(result).toEqual(mockUser);
      expect(mockUserRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('deve retornar null se não encontrado', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      const result = await resolver.getUser(999);

      expect(result).toBeNull();
    });
  });

  // ─── createOrLoginUser ─────────────────────────────────────────────────────

  describe('createOrLoginUser', () => {
    it('deve criar novo usuário quando email não existe', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      mockUserRepo.create.mockReturnValue(mockUser);
      mockUserRepo.save.mockResolvedValue(mockUser);

      const result = await resolver.createOrLoginUser({ email: 'User@Test.com' });

      expect(mockUserRepo.create).toHaveBeenCalledWith({ email: 'user@test.com' });
      expect(mockUserRepo.save).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('deve retornar usuário existente sem criar novo (login)', async () => {
      mockUserRepo.findOne.mockResolvedValue(mockUser);

      const result = await resolver.createOrLoginUser({ email: 'User@Test.com' });

      expect(mockUserRepo.create).not.toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('deve normalizar email para minúsculas e sem espaços', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      mockUserRepo.create.mockReturnValue(mockUser);
      mockUserRepo.save.mockResolvedValue(mockUser);

      await resolver.createOrLoginUser({ email: '  NOVO@EMAIL.COM  ' });

      expect(mockUserRepo.findOne).toHaveBeenCalledWith({
        where: { email: 'novo@email.com' },
      });
    });
  });

  // ─── updateUser ────────────────────────────────────────────────────────────

  describe('updateUser', () => {
    it('deve atualizar email do usuário', async () => {
      const updatedUser = { ...mockUser, email: 'novo@test.com' };
      mockUserRepo.findOne
        .mockResolvedValueOnce(mockUser)   // busca por id
        .mockResolvedValueOnce(null);       // verifica duplicidade
      mockUserRepo.save.mockResolvedValue(updatedUser);

      const result = await resolver.updateUser({ id: 1, email: 'Novo@Test.com' });

      expect(result.email).toBe('novo@test.com');
    });

    it('deve lançar GraphQLError se usuário não encontrado', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      await expect(
        resolver.updateUser({ id: 999, email: 'x@x.com' }),
      ).rejects.toThrow(GraphQLError);
    });

    it('deve lançar GraphQLError se email já está em uso por outro usuário', async () => {
      const otherUser = { id: 2, email: 'outro@test.com' };
      mockUserRepo.findOne
        .mockResolvedValueOnce(mockUser)    // busca por id → encontrou
        .mockResolvedValueOnce(otherUser);  // busca por email → outro usuário já usa

      await expect(
        resolver.updateUser({ id: 1, email: 'outro@test.com' }),
      ).rejects.toThrow(GraphQLError);
    });
  });

  // ─── deleteUser ────────────────────────────────────────────────────────────

  describe('deleteUser', () => {
    it('deve remover usuário e retornar sua cópia', async () => {
      mockUserRepo.findOne.mockResolvedValue(mockUser);
      mockUserRepo.remove.mockResolvedValue(undefined);

      const result = await resolver.deleteUser({ id: 1 });

      expect(mockUserRepo.remove).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(mockUser);
    });

    it('deve lançar GraphQLError se usuário não encontrado', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      await expect(resolver.deleteUser({ id: 999 })).rejects.toThrow(GraphQLError);
    });
  });
});
