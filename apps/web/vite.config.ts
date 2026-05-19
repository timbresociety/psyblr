import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
import { searchForWorkspaceRoot } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@psyblr/game-engine': resolve(__dirname, '../../packages/game-engine/src/index.ts'),
    },
  },
  server: {
    fs: {
      allow: [searchForWorkspaceRoot(__dirname)],
    },
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['src/test/**/*.test.ts'],
  },
});
