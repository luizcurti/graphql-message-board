import { Test, TestingModule } from '@nestjs/testing';
import UserResolver from './user.resolver';
import UserService from '../services/user.service';

describe('UserResolver', () => {
  let resolver: UserResolver;

  const mockUser = { id: 1, email: 'user@test.com', createdAt: new Date() };
  const paginatedUsers = { items: [mockUser], total: 1, page: 1, pages: 1 };

  const mockUserService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    createOrLogin: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserResolver,
        { provide: UserService, useValue: mockUserService },
      ],
    }).compile();

    resolver = module.get<UserResolver>(UserResolver);
  });

  it('getUsers delegates to UserService.findAll', async () => {
    mockUserService.findAll.mockResolvedValue(paginatedUsers);

    const result = await resolver.getUsers({ page: 1, limit: 10 });

    expect(mockUserService.findAll).toHaveBeenCalledWith(1, 10);
    expect(result).toEqual(paginatedUsers);
  });

  it('getUser delegates to UserService.findOne', async () => {
    mockUserService.findOne.mockResolvedValue(mockUser);

    const result = await resolver.getUser(1);

    expect(mockUserService.findOne).toHaveBeenCalledWith(1);
    expect(result).toEqual(mockUser);
  });

  it('createOrLoginUser delegates to UserService.createOrLogin', async () => {
    mockUserService.createOrLogin.mockResolvedValue(mockUser);

    const result = await resolver.createOrLoginUser({ email: 'user@test.com' });

    expect(mockUserService.createOrLogin).toHaveBeenCalledWith('user@test.com');
    expect(result).toEqual(mockUser);
  });

  it('updateUser delegates to UserService.update', async () => {
    mockUserService.update.mockResolvedValue(mockUser);

    const result = await resolver.updateUser({ id: 1, email: 'new@test.com' });

    expect(mockUserService.update).toHaveBeenCalledWith(1, 'new@test.com');
    expect(result).toEqual(mockUser);
  });

  it('deleteUser delegates to UserService.remove', async () => {
    mockUserService.remove.mockResolvedValue(mockUser);

    const result = await resolver.deleteUser({ id: 1 });

    expect(mockUserService.remove).toHaveBeenCalledWith(1);
    expect(result).toEqual(mockUser);
  });
});
