import { Test, TestingModule } from '@nestjs/testing';
import { GraphQLError } from 'graphql';
import UserService from './user.service';
import RepoService from '../repo.service';

describe('UserService', () => {
  let service: UserService;

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
        UserService,
        { provide: RepoService, useValue: { userRepo: mockUserRepo } },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  // ─── findAll ───────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns a paginated list of users', async () => {
      mockUserRepo.findAndCount.mockResolvedValue([[mockUser], 1]);

      const result = await service.findAll(1, 10);

      expect(result).toEqual({ items: [mockUser], total: 1, page: 1, pages: 1 });
      expect(mockUserRepo.findAndCount).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        order: { createdAt: 'DESC' },
      });
    });

    it('computes skip correctly for page 2', async () => {
      mockUserRepo.findAndCount.mockResolvedValue([[], 5]);

      await service.findAll(2, 3);

      expect(mockUserRepo.findAndCount).toHaveBeenCalledWith({
        skip: 3,
        take: 3,
        order: { createdAt: 'DESC' },
      });
    });

    it('returns pages=1 when total is zero', async () => {
      mockUserRepo.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.findAll(1, 10);

      expect(result.pages).toBe(1);
    });
  });

  // ─── findOne ───────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('returns a user by id', async () => {
      mockUserRepo.findOne.mockResolvedValue(mockUser);

      const result = await service.findOne(1);

      expect(result).toEqual(mockUser);
      expect(mockUserRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('returns null when not found', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      const result = await service.findOne(999);

      expect(result).toBeNull();
    });
  });

  // ─── createOrLogin ─────────────────────────────────────────────────────────

  describe('createOrLogin', () => {
    it('creates a new user when the email does not exist yet', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      mockUserRepo.create.mockReturnValue(mockUser);
      mockUserRepo.save.mockResolvedValue(mockUser);

      const result = await service.createOrLogin('User@Test.com');

      expect(mockUserRepo.create).toHaveBeenCalledWith({ email: 'user@test.com' });
      expect(mockUserRepo.save).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('returns the existing user without creating a new one (login)', async () => {
      mockUserRepo.findOne.mockResolvedValue(mockUser);

      const result = await service.createOrLogin('User@Test.com');

      expect(mockUserRepo.create).not.toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('normalizes the email to lowercase and trims whitespace', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      mockUserRepo.create.mockReturnValue(mockUser);
      mockUserRepo.save.mockResolvedValue(mockUser);

      await service.createOrLogin('  NEW@EMAIL.COM  ');

      expect(mockUserRepo.findOne).toHaveBeenCalledWith({
        where: { email: 'new@email.com' },
      });
    });
  });

  // ─── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('updates the user email', async () => {
      const updatedUser = { ...mockUser, email: 'new@test.com' };
      mockUserRepo.findOne
        .mockResolvedValueOnce(mockUser) // lookup by id
        .mockResolvedValueOnce(null); // duplicate email check
      mockUserRepo.save.mockResolvedValue(updatedUser);

      const result = await service.update(1, 'New@Test.com');

      expect(result.email).toBe('new@test.com');
    });

    it('throws a GraphQLError when the user is not found', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      await expect(service.update(999, 'x@x.com')).rejects.toThrow(GraphQLError);
    });

    it('throws a GraphQLError when the email is already used by another user', async () => {
      const otherUser = { id: 2, email: 'other@test.com' };
      mockUserRepo.findOne
        .mockResolvedValueOnce(mockUser) // lookup by id → found
        .mockResolvedValueOnce(otherUser); // lookup by email → already taken

      await expect(service.update(1, 'other@test.com')).rejects.toThrow(GraphQLError);
    });
  });

  // ─── remove ────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('removes the user and returns a copy of it', async () => {
      mockUserRepo.findOne.mockResolvedValue(mockUser);
      mockUserRepo.remove.mockResolvedValue(undefined);

      const result = await service.remove(1);

      expect(mockUserRepo.remove).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(mockUser);
    });

    it('throws a GraphQLError when the user is not found', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(GraphQLError);
    });
  });
});
