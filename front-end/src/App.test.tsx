import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders the Home page at /', () => {
    window.history.pushState({}, '', '/');

    render(<App />);

    expect(screen.getByPlaceholderText('E-mail')).toBeInTheDocument();
  });

  it('renders the 404 page for unknown routes', () => {
    window.history.pushState({}, '', '/nope');

    render(<App />);

    expect(screen.getByText('404 - Page not found')).toBeInTheDocument();
  });
});
