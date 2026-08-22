import { Test, TestingModule } from '@nestjs/testing';
import MessageResolver from './message.resolver';
import MessageService from '../services/message.service';

describe('MessageResolver', () => {
  let resolver: MessageResolver;

  const mockUser = { id: 1, email: 'user@test.com', createdAt: new Date() };
  const mockMessage = {
    id: 1,
    content: 'Hello world',
    userId: 1,
    createdAt: new Date(),
  };
  const paginatedMessages = { items: [mockMessage], total: 1, page: 1, pages: 1 };

  const mockMessageService = {
    findAll: jest.fn(),
    findByUser: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageResolver,
        { provide: MessageService, useValue: mockMessageService },
      ],
    }).compile();

    resolver = module.get<MessageResolver>(MessageResolver);
  });

  it('getMessages delegates to MessageService.findAll', async () => {
    mockMessageService.findAll.mockResolvedValue(paginatedMessages);

    const result = await resolver.getMessages({ page: 1, limit: 10 });

    expect(mockMessageService.findAll).toHaveBeenCalledWith(1, 10);
    expect(result).toEqual(paginatedMessages);
  });

  it('getMessagesFromUser delegates to MessageService.findByUser', async () => {
    mockMessageService.findByUser.mockResolvedValue(paginatedMessages);

    const result = await resolver.getMessagesFromUser({ userId: 1, page: 1, limit: 10 });

    expect(mockMessageService.findByUser).toHaveBeenCalledWith(1, 1, 10);
    expect(result).toEqual(paginatedMessages);
  });

  it('getMessage delegates to MessageService.findOne', async () => {
    mockMessageService.findOne.mockResolvedValue(mockMessage);

    const result = await resolver.getMessage(1);

    expect(mockMessageService.findOne).toHaveBeenCalledWith(1);
    expect(result).toEqual(mockMessage);
  });

  it('createMessage delegates to MessageService.create', async () => {
    mockMessageService.create.mockResolvedValue(mockMessage);

    const result = await resolver.createMessage({ userId: 1, content: 'Hello world' });

    expect(mockMessageService.create).toHaveBeenCalledWith(1, 'Hello world');
    expect(result).toEqual(mockMessage);
  });

  it('updateMessage delegates to MessageService.update', async () => {
    mockMessageService.update.mockResolvedValue(mockMessage);

    const result = await resolver.updateMessage({ id: 1, userId: 1, content: 'Edited' });

    expect(mockMessageService.update).toHaveBeenCalledWith(1, 1, 'Edited');
    expect(result).toEqual(mockMessage);
  });

  it('deleteMessage delegates to MessageService.remove', async () => {
    mockMessageService.remove.mockResolvedValue(mockMessage);

    const result = await resolver.deleteMessage({ id: 1, userId: 1 });

    expect(mockMessageService.remove).toHaveBeenCalledWith(1, 1);
    expect(result).toEqual(mockMessage);
  });

  it('getUser (ResolveField) uses UserLoader to load the message author', async () => {
    const mockLoader = { load: jest.fn().mockResolvedValue(mockUser) };

    const result = await resolver.getUser(mockMessage as any, {
      UserLoader: mockLoader,
    } as any);

    expect(mockLoader.load).toHaveBeenCalledWith(mockMessage.userId);
    expect(result).toEqual(mockUser);
  });
});
