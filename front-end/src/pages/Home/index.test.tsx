import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MockedProvider, MockedResponse } from '@apollo/client/testing';
import Home from './index';
import { CREATE_OR_LOGIN_USER } from '../../graphql/user';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

function renderHome(mocks: MockedResponse[]) {
  return render(
    <MockedProvider mocks={mocks}>
      <Home />
    </MockedProvider>,
  );
}

describe('Home page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(window, 'alert').mockImplementation(() => undefined);
  });

  it('logs in and navigates to the dashboard on a valid email (happy path)', async () => {
    const mocks: MockedResponse[] = [
      {
        request: { query: CREATE_OR_LOGIN_USER, variables: { email: 'user@test.com' } },
        result: { data: { createOrLoginUser: { id: 7 } } },
      },
    ];

    renderHome(mocks);

    fireEvent.change(screen.getByPlaceholderText('E-mail'), {
      target: { value: 'user@test.com' },
    });
    fireEvent.click(screen.getByText('Login or Register'));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/dashboard?id=7'));
  });

  it('alerts and does not navigate for an empty email (sad path)', async () => {
    renderHome([]);

    fireEvent.click(screen.getByText('Login or Register'));

    expect(window.alert).toHaveBeenCalledWith('Insert a valid e-mail!');
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
