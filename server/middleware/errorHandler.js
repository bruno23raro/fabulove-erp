/**
 * Middleware centralizado de tratamento de erros
 */

import logger from '../utils/logger.js';

/**
 * Cria um erro com statusCode embutido
 */
export const createError = (statusCode, message) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

/**
 * Middleware de erro — deve ser registrado DEPOIS de todas as rotas
 */
const errorHandler = (err, req, res, _next) => {
  const statusCode = err.statusCode || 500;
  const isDev = process.env.NODE_ENV === 'development';

  // Não vaza detalhes internos em produção
  const message =
    statusCode < 500
      ? err.message
      : isDev
        ? err.message
        : 'Ocorreu um erro interno. Tente novamente mais tarde.';

  if (statusCode >= 500) {
    logger.error(`[Error] ${err.message}`, { stack: err.stack, url: req.originalUrl });
  }

  return res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(isDev && statusCode >= 500 ? { stack: err.stack } : {}),
    },
  });
};

export default errorHandler;
