import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './auth/AuthProvider';
import { ThemedToaster } from './components/themed-toaster';
import { queryClient } from './lib/queryClient';
import { createRouter } from './router';
import './index.css';

const router = createRouter();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
        <ThemedToaster position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
