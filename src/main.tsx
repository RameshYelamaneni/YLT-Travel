import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './lib/auth';
import { useTheme, applyTheme } from './store/theme';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

// Apply persisted theme before first render
applyTheme(useTheme.getState().theme);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
