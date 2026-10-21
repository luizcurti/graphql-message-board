import React from 'react';
import { Routes, Route } from 'react-router-dom';

import Home from './pages/Home';
import Board from './pages/Board';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/dashboard" element={<Board />} />
      <Route path="*" element={<h1>404 - Page not found</h1>} />
    </Routes>
  );
}
