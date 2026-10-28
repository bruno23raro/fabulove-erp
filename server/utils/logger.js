/**
 * Utilitário de logging estruturado — ES module
 */

import { createLogger, format, transports } from 'winston';

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'sizren-erp' },
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.simple()
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'logs/error.log', level: 'error' }),
    new transports.File({ filename: 'logs/combined.log' }),
  ],
});

export default logger;
