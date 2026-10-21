import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MockedProvider, MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import Board from './index';
import { GET_ALL_MESSAGES, CREATE_MESSAGE, DELETE_MESSAGE, MESSAGE_ADDED, IMessage } from '../../graphql/message';

const USER_ID = 1;

// Subscription mock required by MockedProvider; never resolves.
const MESSAGE_ADDED_MOCK: MockedResponse = {
  request: { query: MESSAGE_ADDED },
  result: {
    data: {
      messageAdded: { id: 0, content: '', userId: 0, user: { email: '' } },
    },
  },
  delay: Infinity,
};

function listMock(page: number, items: IMessage[], total = items.length, pages = 1): MockedResponse {
  return {
    request: { query: GET_ALL_MESSAGES, variables: { page, limit: 10 } },
    result: { data: { getMessages: { items, total, page, pages } } },
  };
}

const own: IMessage = { id: 1, content: 'Mine', userId: USER_ID, user: { email: 'me@test.com' } };
const other: IMessage = { id: 2, content: 'Theirs', userId: 99, user: { email: 'other@test.com' } };

function renderBoard(mocks: MockedResponse[]) {
  return render(
    <MemoryRouter
      initialEntries={[`/dashboard?id=${USER_ID}`]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <MockedProvider mocks={[...mocks, MESSAGE_ADDED_MOCK]}>
        <Board />
      </MockedProvider>
    </MemoryRouter>,
  );
}

describe('Board page', () => {
  beforeEach(() => {
    jest.spyOn(window, 'alert').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it('renders the loaded message list (happy path)', async () => {
    const mocks: MockedResponse[] = [
      {
        request: { query: GET_ALL_MESSAGES, variables: { page: 1, limit: 10 } },
        result: {
          data: {
            getMessages: {
              items: [
                { id: 1, content: 'Hello world', userId: USER_ID, user: { email: 'user@test.com' } },
              ],
              total: 1,
              page: 1,
              pages: 1,
            },
          },
        },
      },
    ];

    renderBoard(mocks);

    expect(screen.getByText('Loading messages...')).toBeInTheDocument();
    expect(await screen.findByText('Hello world')).toBeInTheDocument();
  });

  it('shows an empty state when there are no messages (sad path)', async () => {
    const mocks: MockedResponse[] = [
      {
        request: { query: GET_ALL_MESSAGES, variables: { page: 1, limit: 10 } },
        result: { data: { getMessages: { items: [], total: 0, page: 1, pages: 1 } } },
      },
    ];

    renderBoard(mocks);

    expect(
      await screen.findByText('No messages yet. Be the first to write one!'),
    ).toBeInTheDocument();
  });

  it('alerts and does not submit when sending an empty message (sad path)', async () => {
    const mocks: MockedResponse[] = [
      {
        request: { query: GET_ALL_MESSAGES, variables: { page: 1, limit: 10 } },
        result: { data: { getMessages: { items: [], total: 0, page: 1, pages: 1 } } },
      },
    ];

    renderBoard(mocks);

    await screen.findByText('No messages yet. Be the first to write one!');

    fireEvent.click(screen.getByText('Send'));

    expect(window.alert).toHaveBeenCalledWith('Message cannot be empty.');
  });

  it('sends a message and clears the textarea (happy path)', async () => {
    const mocks: MockedResponse[] = [
      {
        request: { query: GET_ALL_MESSAGES, variables: { page: 1, limit: 10 } },
        result: { data: { getMessages: { items: [], total: 0, page: 1, pages: 1 } } },
      },
      {
        request: { query: CREATE_MESSAGE, variables: { content: 'New message', userId: USER_ID } },
        result: {
          data: {
            createMessage: {
              id: 1,
              content: 'New message',
              userId: USER_ID,
              user: { email: 'user@test.com' },
            },
          },
        },
      },
      {
        request: { query: GET_ALL_MESSAGES, variables: { page: 1, limit: 10 } },
        result: {
          data: {
            getMessages: {
              items: [
                { id: 1, content: 'New message', userId: USER_ID, user: { email: 'user@test.com' } },
              ],
              total: 1,
              page: 1,
              pages: 1,
            },
          },
        },
      },
    ];

    renderBoard(mocks);

    await screen.findByText('No messages yet. Be the first to write one!');

    const textarea = screen.getByPlaceholderText('Write a message...');
    fireEvent.change(textarea, { target: { value: 'New message' } });
    fireEvent.click(screen.getByText('Send'));

    await waitFor(() => expect((textarea as HTMLTextAreaElement).value).toBe(''));
  });

  it('shows the delete action only on own messages', async () => {
    renderBoard([listMock(1, [own, other])]);

    await screen.findByText('Mine');
    expect(screen.getAllByTitle('Delete message')).toHaveLength(1);
    expect(screen.getByText('me@test.com')).toBeInTheDocument();
    expect(screen.getByText('other@test.com')).toBeInTheDocument();
  });

  it('deletes an own message after confirmation (happy path)', async () => {
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    renderBoard([
      listMock(1, [own]),
      {
        request: { query: DELETE_MESSAGE, variables: { id: 1, userId: USER_ID } },
        result: { data: { deleteMessage: { id: 1 } } },
      },
      listMock(1, []),
    ]);

    fireEvent.click(await screen.findByTitle('Delete message'));

    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this message?');
    expect(
      await screen.findByText('No messages yet. Be the first to write one!'),
    ).toBeInTheDocument();
  });

  it('keeps the message when deletion is cancelled (sad path)', async () => {
    jest.spyOn(window, 'confirm').mockReturnValue(false);
    renderBoard([listMock(1, [own])]);

    fireEvent.click(await screen.findByTitle('Delete message'));

    expect(screen.getByText('Mine')).toBeInTheDocument();
  });

  it('hides pagination when there is a single page', async () => {
    renderBoard([listMock(1, [own])]);

    await screen.findByText('Mine');
    expect(screen.queryByText(/messages$/)).not.toBeInTheDocument();
  });

  it('navigates between pages and disables the edge buttons', async () => {
    renderBoard([
      listMock(1, [own], 11, 2),
      listMock(2, [other], 11, 2),
    ]);

    const pageButtons = () => screen.getAllByRole('button').filter((b) => b.textContent === '');

    await screen.findByText('Mine');
    expect(screen.getByText(/1 \/ 2/)).toHaveTextContent('11 messages');
    expect(pageButtons()[0]).toBeDisabled();
    expect(pageButtons()[1]).toBeEnabled();

    fireEvent.click(pageButtons()[1]);
    expect(await screen.findByText('Theirs')).toBeInTheDocument();
    expect(screen.getByText(/2 \/ 2/)).toBeInTheDocument();
    expect(pageButtons()[0]).toBeEnabled();
    expect(pageButtons()[1]).toBeDisabled();

    fireEvent.click(pageButtons()[0]);
    expect(await screen.findByText('Mine')).toBeInTheDocument();
    expect(pageButtons()[0]).toBeDisabled();
  });

  it('shows "Sending..." and keeps the text until the server confirms', async () => {
    renderBoard([
      listMock(1, []),
      {
        request: { query: CREATE_MESSAGE, variables: { content: 'Slow', userId: USER_ID } },
        result: { data: { createMessage: { ...own, content: 'Slow' } } },
        delay: 50,
      },
      listMock(1, [{ ...own, content: 'Slow' }]),
    ]);

    await screen.findByText('No messages yet. Be the first to write one!');
    fireEvent.change(screen.getByPlaceholderText('Write a message...'), {
      target: { value: 'Slow' },
    });
    fireEvent.click(screen.getByText('Send'));

    const textarea = screen.getByPlaceholderText('Write a message...');
    expect(screen.getByText('Sending...').closest('button')).toBeDisabled();
    expect(textarea).toHaveValue('Slow');

    await waitFor(() => expect(textarea).toHaveValue(''));
    expect(await screen.findByText('Slow', { selector: 'p' })).toBeInTheDocument();
    expect(screen.getByText('Send').closest('button')).toBeEnabled();
  });

  it('keeps the typed text when the server rejects it (sad path)', async () => {
    renderBoard([
      listMock(1, []),
      {
        request: { query: CREATE_MESSAGE, variables: { content: 'Bad', userId: USER_ID } },
        result: { errors: [new GraphQLError('User not found')] },
      },
    ]);

    await screen.findByText('No messages yet. Be the first to write one!');
    fireEvent.change(screen.getByPlaceholderText('Write a message...'), {
      target: { value: 'Bad' },
    });
    fireEvent.click(screen.getByText('Send'));

    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('User not found'));
    expect(screen.getByPlaceholderText('Write a message...')).toHaveValue('Bad');
  });

  it('limits the textarea to 500 characters', async () => {
    renderBoard([listMock(1, [])]);

    await screen.findByText('No messages yet. Be the first to write one!');
    expect(screen.getByPlaceholderText('Write a message...')).toHaveAttribute('maxLength', '500');
  });

  it('alerts when there is no user id in the URL (sad path)', async () => {
    render(
      <MemoryRouter
        initialEntries={['/dashboard']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <MockedProvider mocks={[listMock(1, []), MESSAGE_ADDED_MOCK]}>
          <Board />
        </MockedProvider>
      </MemoryRouter>,
    );

    await screen.findByText('No messages yet. Be the first to write one!');
    fireEvent.change(screen.getByPlaceholderText('Write a message...'), {
      target: { value: 'Hi' },
    });
    fireEvent.click(screen.getByText('Send'));

    expect(window.alert).toHaveBeenCalledWith('User not identified. Please log in again.');
  });
});
