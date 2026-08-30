import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MockedProvider, MockedResponse } from '@apollo/client/testing';
import Board from './index';
import { GET_ALL_MESSAGES, CREATE_MESSAGE, MESSAGE_ADDED } from '../../graphql/message';

const USER_ID = 1;

// The Board page subscribes to MESSAGE_ADDED on mount; this mock just needs to be
// present so MockedProvider has a match for it. It never resolves during these tests.
const MESSAGE_ADDED_MOCK: MockedResponse = {
  request: { query: MESSAGE_ADDED },
  result: {
    data: {
      messageAdded: { id: 0, content: '', userId: 0, user: { email: '' } },
    },
  },
  delay: Infinity,
};

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
});
