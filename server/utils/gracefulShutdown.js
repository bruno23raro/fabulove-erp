/**
 * gracefulShutdown.js — Encerramento limpo do servidor
 *
 * Captura signals SIGINT/SIGTERM, espera requisições existentes finalizarem,
 * fecha conexões do banco e processadores antes de sair.
 */

import logger from './logger.js';

let isShuttingDown = false;
let server = null;
let pool = null;

/** Registra o servidor e pool para fechamento ordenado */
export function register(serverInstance, poolInstance) {
  server = serverInstance;
  pool = poolInstance;
}

/** Encerra o servidor gracefully */
export async function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`🛑 Recebido ${signal || 'SIGTERM'} — iniciando encerramento graceful...`);

  // Para de aceitar novas conexões
  if (server) {
    await new Promise((resolve) => server.close(resolve));
    logger.info('✅ HTTP server fechado');
  }

  // Aguarda requisições existentes (timeout 30s)
  const shutdownTimeout = setTimeout(() => {
    logger.error('⚠️  Timeout de 30s excedido — forçando encerramento');
    process.exit(1);
  }, 30000);
  shutdownTimeout.unref();

  // Fecha pool do banco
  if (pool) {
    try {
      await pool.end();
      logger.info('✅ Pool do PostgreSQL fechado');
    } catch (err) {
      logger.error('Erro ao fechar pool:', err.message);
    }
  }

  logger.info('✅ Encerramento graceful concluído');
  process.exit(0);
}

/** Registra handlers de signal */
export function registerSignals() {
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Tratamento de erros não capturados
  process.on('uncaughtException', (err) => {
    logger.error('❌ Uncaught Exception:', err);
    shutdown('uncaughtException').catch(() => process.exit(1));
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('❌ Unhandled Rejection:', reason);
  });
}
