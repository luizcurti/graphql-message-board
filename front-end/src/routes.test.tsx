import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MockedProvider, MockedResponse } from '@apollo/client/testing';
import { GET_ALL_MESSAGES, MESSAGE_ADDED } from './graphql/message';
import AppRoutes from './routes';

const mocks: MockedResponse[] = [
  {
    request: { query: GET_ALL_MESSAGES, variables: { page: 1, limit: 10 } },
    result: { data: { getMessages: { items: [], total: 0, page: 1, pages: 1 } } },
  },
  { request: { query: MESSAGE_ADDED }, result: { data: {} }, delay: Infinity },
];

function renderAt(path: string) {
  return render(
    <MemoryRouter
      initialEntries={[path]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <MockedProvider mocks={mocks}>
        <AppRoutes />
      </MockedProvider>
    </MemoryRouter>,
  );
}

describe('routes', () => {
  it('/ renders Home', () => {
    renderAt('/');
    expect(screen.getByText('Login or Register')).toBeInTheDocument();
  });

  it('/dashboard renders Board', async () => {
    renderAt('/dashboard?id=1');
    expect(screen.getByText('Loading messages...')).toBeInTheDocument();
    expect(await screen.findByText('Message Board')).toBeInTheDocument();
  });

  it.each(['/unknown', '/dashboard/extra'])('%s renders 404 (sad)', (path) => {
    renderAt(path);
    expect(screen.getByText('404 - Page not found')).toBeInTheDocument();
  });
});
