import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { MockedProvider, MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import { useMessages } from './useMessages';
import { GET_ALL_MESSAGES, CREATE_MESSAGE, DELETE_MESSAGE, MESSAGE_ADDED } from '../graphql/message';

const USER_ID = 1;

// useMessages subscribes to MESSAGE_ADDED on mount; this mock just needs to be
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

const emptyListMock: MockedResponse = {
  request: { query: GET_ALL_MESSAGES, variables: { page: 1, limit: 10 } },
  result: { data: { getMessages: { items: [], total: 0, page: 1, pages: 1 } } },
};

const oneMessageMock: MockedResponse = {
  request: { query: GET_ALL_MESSAGES, variables: { page: 1, limit: 10 } },
  result: {
    data: {
      getMessages: {
        items: [{ id: 1, content: 'Hi', userId: USER_ID, user: { email: 'user@test.com' } }],
        total: 1,
        page: 1,
        pages: 1,
      },
    },
  },
};

function wrapper(mocks: MockedResponse[]) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <MockedProvider mocks={[...mocks, MESSAGE_ADDED_MOCK]}>{children}</MockedProvider>;
  };
}

describe('useMessages', () => {
  beforeEach(() => {
    jest.spyOn(window, 'alert').mockImplementation(() => undefined);
    jest.spyOn(window, 'confirm').mockImplementation(() => true);
  });

  afterEach(() => jest.restoreAllMocks());

  it('loads the paginated message list', async () => {
    const { result } = renderHook(() => useMessages(USER_ID), {
      wrapper: wrapper([oneMessageMock]),
    });

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.total).toBe(1);
  });

  it('sends a message and refetches the list', async () => {
    const createMock: MockedResponse = {
      request: {
        query: CREATE_MESSAGE,
        variables: { content: 'Hello', userId: USER_ID },
      },
      result: {
        data: {
          createMessage: {
            id: 2,
            content: 'Hello',
            userId: USER_ID,
            user: { email: 'user@test.com' },
          },
        },
      },
    };

    const { result } = renderHook(() => useMessages(USER_ID), {
      wrapper: wrapper([emptyListMock, createMock, emptyListMock]),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    let sent = false;
    act(() => {
      sent = result.current.sendMessage('Hello');
    });

    expect(sent).toBe(true);
    await waitFor(() => expect(result.current.creating).toBe(false));
  });

  it('rejects an empty message without calling the mutation', async () => {
    const { result } = renderHook(() => useMessages(USER_ID), {
      wrapper: wrapper([emptyListMock]),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    let sent = true;
    act(() => {
      sent = result.current.sendMessage('   ');
    });

    expect(sent).toBe(false);
    expect(window.alert).toHaveBeenCalledWith('Message cannot be empty.');
  });

  it('rejects sending when there is no identified user', async () => {
    const { result } = renderHook(() => useMessages(0), {
      wrapper: wrapper([
        { request: { query: GET_ALL_MESSAGES, variables: { page: 1, limit: 10 } }, result: emptyListMock.result },
      ]),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    let sent = true;
    act(() => {
      sent = result.current.sendMessage('Hello');
    });

    expect(sent).toBe(false);
    expect(window.alert).toHaveBeenCalledWith('User not identified. Please log in again.');
  });

  it('alerts with the server error message when creating a message fails', async () => {
    const errorMock: MockedResponse = {
      request: {
        query: CREATE_MESSAGE,
        variables: { content: 'Hello', userId: USER_ID },
      },
      result: { errors: [new GraphQLError('Message content cannot be empty')] },
    };

    const { result } = renderHook(() => useMessages(USER_ID), {
      wrapper: wrapper([emptyListMock, errorMock]),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.sendMessage('Hello');
    });

    await waitFor(() =>
      expect(window.alert).toHaveBeenCalledWith('Message content cannot be empty'),
    );
  });

  it('does nothing when the delete confirmation is declined', async () => {
    (window.confirm as jest.Mock).mockReturnValueOnce(false);

    const { result } = renderHook(() => useMessages(USER_ID), {
      wrapper: wrapper([oneMessageMock]),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.removeMessage(1);
    });

    expect(window.confirm).toHaveBeenCalled();
  });

  it('deletes a message after confirmation', async () => {
    const deleteMock: MockedResponse = {
      request: { query: DELETE_MESSAGE, variables: { id: 1, userId: USER_ID } },
      result: { data: { deleteMessage: { id: 1 } } },
    };

    const { result } = renderHook(() => useMessages(USER_ID), {
      wrapper: wrapper([oneMessageMock, deleteMock, emptyListMock]),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.removeMessage(1);
    });

    await waitFor(() => expect(result.current.messages).toHaveLength(0));
  });
});
