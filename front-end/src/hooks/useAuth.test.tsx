import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { MockedProvider, MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import { useAuth } from './useAuth';
import { CREATE_OR_LOGIN_USER } from '../graphql/user';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

function wrapper(mocks: MockedResponse[]) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <MockedProvider mocks={mocks}>{children}</MockedProvider>;
  };
}

describe('useAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(window, 'alert').mockImplementation(() => undefined);
  });

  it('navigates to the dashboard with the returned user id on successful login', async () => {
    const mocks: MockedResponse[] = [
      {
        request: { query: CREATE_OR_LOGIN_USER, variables: { email: 'user@test.com' } },
        result: { data: { createOrLoginUser: { id: 42 } } },
      },
    ];

    const { result } = renderHook(() => useAuth(), { wrapper: wrapper(mocks) });

    act(() => {
      result.current.login('user@test.com');
    });

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/dashboard?id=42'));
    expect(window.alert).not.toHaveBeenCalled();
  });

  it('alerts and does not call the mutation for an empty email', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: wrapper([]) });

    act(() => {
      result.current.login('   ');
    });

    expect(window.alert).toHaveBeenCalledWith('Insert a valid e-mail!');
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('alerts with the server error message when the mutation fails', async () => {
    const mocks: MockedResponse[] = [
      {
        request: { query: CREATE_OR_LOGIN_USER, variables: { email: 'bad@test.com' } },
        result: {
          errors: [new GraphQLError('Invalid email format')],
        },
      },
    ];

    const { result } = renderHook(() => useAuth(), { wrapper: wrapper(mocks) });

    act(() => {
      result.current.login('bad@test.com');
    });

    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Invalid email format'));
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
