/**
 * vitest.config.js — Configuração de testes para ESM
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['server/tests/**/*.test.js'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      include: ['server/**/*.js'],
      exclude: ['server/scripts/**', 'server/tests/**'],
    },
    // Aumenta timeout para testes de integração com DB
    testTimeout: 15000,
  },
});
