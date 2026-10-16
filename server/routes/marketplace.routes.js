/**
 * Rotas de Integrações com Marketplaces
 *
 * POST /api/marketplaces/shopee/config     — salvar credenciais
 * GET  /api/marketplaces/shopee/status     — status configuração
 * POST /api/marketplaces/shopee/sync       — sincronizar produtos da Shopee
 * GET  /api/marketplaces/shopee/export     — exportar CSV padronizado
 * GET  /api/marketplaces/shopee/logs       — logs de sincronização
 * POST /api/marketplaces/shopee/sync-stock — sincronizar estoque após venda
 */

import { Router } from 'express';
import * as shopeeController from '../controllers/shopee.controller.js';
import { authenticateToken, authorizeRole } from '../utils/jwt.js';

const router = Router();

router.use(authenticateToken);

// ── Shopee ───────────────────────────────────────────────────────────────────
router.post('/shopee/login', authorizeRole('admin', 'manager'), shopeeController.login);
router.post('/shopee/config', authorizeRole('admin'), shopeeController.saveConfig);
router.get('/shopee/status', shopeeController.getStatus);
router.post('/shopee/sync', authorizeRole('admin', 'manager'), shopeeController.syncProducts);
router.get('/shopee/export', shopeeController.exportCsv);
router.get('/shopee/logs', shopeeController.getLogs);
router.post('/shopee/sync-stock', authorizeRole('admin', 'manager', 'operator'), shopeeController.syncStock);

// ── Status geral ─────────────────────────────────────────────────────────────
router.get('/status', (req, res) => {
  const integrations = [
    { name: 'Shopee', key: 'SHOPEE_API_KEY', configured: Boolean(process.env.SHOPEE_API_KEY) },
    { name: 'Mercado Livre', key: 'MERCADOLIVRE_API_KEY', configured: Boolean(process.env.MERCADOLIVRE_API_KEY) },
  ];
  return res.json({ success: true, data: { integrations, message: 'Configure as credenciais via API para habilitar.' } });
});

router.get('/', authorizeRole('admin', 'manager'), (req, res) => {
  return res.json({ success: true, data: { message: 'Módulo de marketplaces.' } });
});

export default router;
