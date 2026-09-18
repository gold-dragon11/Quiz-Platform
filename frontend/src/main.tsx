import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/App';
import { initErrorReporting } from '@/lib/sentry';
import { installStaleBuildRecovery } from '@/lib/stale-build';
import '@/styles/globals.css';

initErrorReporting();
installStaleBuildRecovery();

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
