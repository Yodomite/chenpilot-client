'use client';

import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { store } from '@/store';
import { initializeAuth } from '@/store/slices/authSlice';
import { initializeUI } from '@/store/slices/uiSlice';
import apiService from '@/services/api';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  useEffect(() => {
    apiService.loadTokenFromStorage();
    // Initialize authentication state from localStorage
    store.dispatch(initializeAuth());
    // Initialize UI state (theme, etc.)
    store.dispatch(initializeUI());
  }, []);

  return (
    <Provider store={store}>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10B981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#EF4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </Provider>
  );
}
