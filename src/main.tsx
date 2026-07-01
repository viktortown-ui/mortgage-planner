import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './shared/ErrorBoundary';
import { applyTheme, getStoredTheme } from './shared/theme';
import { initMetrica } from './shared/analytics/metrica';

applyTheme(getStoredTheme());
initMetrica();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
