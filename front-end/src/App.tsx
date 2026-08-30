import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ApolloProvider } from '@apollo/client';

import api from './services/api';
import Routes from './routes';

import GlobalStyles from './styles/global';

function App() {
  return (
    <ApolloProvider client={api}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes />

        <GlobalStyles />
      </BrowserRouter>
    </ApolloProvider>
  );
}

export default App;
