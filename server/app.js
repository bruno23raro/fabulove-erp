/**
 * SIZEN ERP - Servidor Principal
 *
 * API RESTful construída com Express, autenticada com JWT,
 * conectada ao PostgreSQL e com middleware de segurança.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Carregar .env antes de tudo
dotenv.config();

// Validar variáveis de ambiente
import { validateEnv } from './utils/validateEnv.js';
validateEnv();

import authRoutes       from './routes/auth.routes.js';
import productRoutes    from './routes/product.routes.js';
import categoryRoutes   from './routes/category.routes.js';
import orderRoutes      from './routes/order.routes.js';
import customerRoutes   from './routes/customer.routes.js';
import dashboardRoutes  from './routes/dashboard.routes.js';
import automationRoutes from './routes/automation.routes.js';
import marketplaceRoutes from './routes/marketplace.routes.js';
import mlRoutes from './routes/ml.routes.js';
import reportRoutes     from './routes/report.routes.js';
import configRoutes     from './routes/config.routes.js';
import supplierRoutes   from './routes/supplier.routes.js';
import purchaseRoutes   from './routes/purchase.routes.js';
import stockRoutes      from './routes/stock.routes.js';
import posRoutes        from './routes/pos.routes.js';
import financialRoutes from './routes/financial.routes.js';
import crmRoutes from './routes/crm.routes.js';
import aiRoutes from './routes/ai.routes.js';

import errorHandler from './middleware/errorHandler.js';
import { authRateLimit, apiRateLimit } from './middleware/rateLimit.js';
import logger from './utils/logger.js';
import { registerSignals } from './utils/gracefulShutdown.js';

registerSignals();

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// Garantir que o diretório de logs existe
const logsDir = path.join(__dirname, '..', 'logs');
try {
  if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
} catch (err) {
  console.warn('[LOGS] Não foi possível criar:', err.message);
}

const app  = express();
const PORT = parseInt(process.env.PORT) || 3000;

// ── Segurança ─────────────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));

// ── Parsers e compressão ──────────────────────────────────────────────────────
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Logging HTTP ──────────────────────────────────────────────────────────────
app.use(morgan('combined', {
  stream: { write: (msg) => logger.info(msg.trim()) },
}));

// ── Arquivos estáticos ────────────────────────────────────────────────────────
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (process.env.NODE_ENV !== 'production') {
  try {
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    app.use('/uploads', express.static(uploadsDir));
  } catch (err) {
    console.warn('[STATIC] Não foi possível servir uploads:', err.message);
  }
}

const clientDist = path.join(__dirname, '..', 'client', 'dist');
try {
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
  }
} catch (err) {
  console.warn('[STATIC] Client dist não disponível:', err.message);
}

// ── Health & versão ───────────────────────────────────────────────────────────
app.get('/api/health',  (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.get('/api/version', (req, res) => res.json({ version: '1.0.0', name: 'SIZEN ERP' }));

// ── Rate limiting ─────────────────────────────────────────────────────────────
app.use('/api/auth', authRateLimit);   // mais restritivo — 20 req/15min
app.use('/api',      apiRateLimit);    // geral — 300 req/15min

// ── Rotas da API ──────────────────────────────────────────────────────────────
app.use('/api/auth',         authRoutes);
app.use('/api/products',     productRoutes);
app.use('/api/categories',   categoryRoutes);
app.use('/api/orders',       orderRoutes);
app.use('/api/customers',    customerRoutes);
app.use('/api/dashboard',    dashboardRoutes);
app.use('/api/automation',   automationRoutes);
app.use('/api/marketplaces', marketplaceRoutes);
app.use('/api/marketplaces', mlRoutes);
app.use('/api/reports',      reportRoutes);
app.use('/api/config',       configRoutes);
app.use('/api/suppliers',    supplierRoutes);
app.use('/api/purchases',    purchaseRoutes);
app.use('/api/stock',        stockRoutes);
app.use('/api/pos',          posRoutes);
app.use('/api/financial',    financialRoutes);
app.use('/api/crm',         crmRoutes);
app.use('/api/ai',          aiRoutes);

// ── SPA fallback (só se o build existir) ─────────────────────────────────────
if (fs.existsSync(clientDist)) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
} else {
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.status(200).json({ message: 'SIZEN ERP API', hint: 'Run npm run build to serve frontend.' });
    }
  });
}

// ── Tratamento de erros ───────────────────────────────────────────────────────
app.use(errorHandler);

// ── Inicialização ─────────────────────────────────────────────────────────────
import('./config/database.js').then(({ default: pool }) => {
  import('./utils/gracefulShutdown.js').then(({ register }) => {
    register(server, pool);
  });
});

const server = app.listen(PORT, () => {
  logger.info(`🚀 SIZEN ERP server rodando na porta ${PORT}`);
  logger.info(`📊 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`📧 Email: ${process.env.RESEND_API_KEY ? 'Resend' : (process.env.SMTP_HOST ? 'SMTP' : 'simulado')}`);
});

export default app;
