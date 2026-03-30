import { defineConfig } from '@playwright/test';

const frontendPort = Number(process.env.PLAYWRIGHT_FRONTEND_PORT || 4173);
const backendPort = Number(process.env.PLAYWRIGHT_BACKEND_PORT || 3100);
const useExistingServers = process.env.PLAYWRIGHT_USE_EXISTING === '1';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${frontendPort}`,
    trace: 'on-first-retry',
  },
  webServer: useExistingServers
    ? undefined
    : [
        {
          command: `PORT=${backendPort} node ./scripts/start-e2e-backend.mjs`,
          url: `http://127.0.0.1:${backendPort}/health`,
          reuseExistingServer: false,
          cwd: '.',
          timeout: 60 * 1000,
        },
        {
          command: `VITE_API_URL=http://127.0.0.1:${backendPort} npm run dev -- --host 127.0.0.1 --port ${frontendPort}`,
          url: `http://127.0.0.1:${frontendPort}`,
          reuseExistingServer: false,
          cwd: '.',
          timeout: 60 * 1000,
        },
      ],
});
