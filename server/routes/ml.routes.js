/**
 * Mercado Livre Routes
 *
 * POST /api/marketplaces/ml/auth-url        — gerar URL OAuth de autorização
 * GET  /api/marketplaces/ml/status          — status configuração
 * POST /api/marketplaces/ml/callback        — processar callback OAuth
 * POST /api/marketplaces/ml/disconnect      — desconectar conta
 * POST /api/marketplaces/ml/sync            — sincronizar produtos da ML
 * GET  /api/marketplaces/ml/products        — listar produtos da ML
 * GET  /api/marketplaces/ml/orders          — listar pedidos da ML
 * POST /api/marketplaces/ml/webhook         — webhook da ML (público)
 */

import { Router } from 'express';
import * as mlController from '../controllers/ml.controller.js';
import { authenticateToken, authorizeRole } from '../utils/jwt.js';

const router = Router();

// ── Middleware: autenticar exceto webhook ──────────────────────────────────────
router.use((req, res, next) => {
  if (req.path === '/webhook') return next();
  authenticateToken(req, res, next);
});

// ── ML OAuth ──────────────────────────────────────────────────────────────────
router.post('/ml/auth-url', authorizeRole('admin', 'manager'), mlController.getAuthUrl);
router.post('/ml/callback', authorizeRole('admin', 'manager'), mlController.handleCallback);
router.post('/ml/disconnect', authorizeRole('admin', 'manager'), mlController.disconnect);

// ── ML Status ─────────────────────────────────────────────────────────────────
router.get('/ml/status', mlController.getStatus);

// ── ML Ações ──────────────────────────────────────────────────────────────────
router.post('/ml/sync', authorizeRole('admin', 'manager'), mlController.syncProducts);
router.get('/ml/products', authorizeRole('admin', 'manager'), mlController.listProducts);
router.get('/ml/orders', authorizeRole('admin', 'manager'), mlController.listOrders);
router.post('/ml/push-product', authorizeRole('admin', 'manager'), mlController.pushProduct);

// ── ML Webhook (público, sem token) ───────────────────────────────────────────
router.post('/ml/webhook', mlController.webhook);

export default router;
