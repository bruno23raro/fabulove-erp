/**
 * Rotas de Integrações com Marketplaces
 *
 * POST /api/marketplaces/shopee/auth-url     — gerar URL OAuth de autorização
 * GET  /api/marketplaces/shopee/status       — status configuração
 * POST /api/marketplaces/shopee/disconnect   — desconectar conta
 * POST /api/marketplaces/shopee/config       — salvar credenciais API Key
 * POST /api/marketplaces/shopee/sync         — sincronizar produtos da Shopee
 * GET  /api/marketplaces/shopee/export       — exportar CSV padronizado
 * GET  /api/marketplaces/shopee/logs         — logs de sincronização
 * POST /api/marketplaces/shopee/sync-stock   — sincronizar estoque após venda
 * POST /api/marketplaces/shopee/oauth/callback — processar callback OAuth
 *
 * Mock Adapter (development/testing):
 * GET  /api/marketplaces/mock/status         — status do mock
 * POST /api/marketplaces/mock/auth           — conectar mock
 * GET  /api/marketplaces/mock/products       — listar produtos mock
 * POST /api/marketplaces/mock/orders         — listar pedidos mock
 * POST /api/marketplaces/mock/stock/update   — atualizar estoque mock
 * POST /api/marketplaces/mock/webhook        — processar webhook mock
 * POST /api/marketplaces/mock/disconnect     — desconectar mock
 */

import { Router } from "express";
import * as shopeeController from "../controllers/shopee.controller.js";
import { authenticateToken, authorizeRole } from "../utils/jwt.js";
import marketplaceService from "../services/marketplace.service.js";
import {
  connect as shopeeConnect,
  handleCallback as shopeeHandleCallback,
  syncProducts as shopeeSync,
  getStatus as shopeeGetStatus,
  isConnected as shopeeIsConnected,
} from '../services/shopee.service';
import {
  connect as mlConnect,
  handleCallback as mlHandleCallback,
  syncProducts as mlSync,
  getStatus as mlGetStatus,
  isConnected as mlIsConnected,
} from '../services/mercadolivre.service';
import {
  syncErpToLojeXa,
  fetchLojeXaProducts,
  fetchLojeXaStockBySku,
  reportSaleLojeXa,
} from '../services/lojexa.service';

const router = Router();

router.use(authenticateToken);

// ── Shopee OAuth ──────────────────────────────────────────────────────────────
router.post("/shopee/auth-url", authorizeRole("admin", "manager"), shopeeController.getAuthUrl);
router.post("/shopee/oauth/callback", authorizeRole("admin", "manager"), shopeeController.handleCallback);
router.post("/shopee/disconnect", authorizeRole("admin", "manager"), shopeeController.disconnect);

// ── Shopee Config ─────────────────────────────────────────────────────────────
router.post("/shopee/config", authorizeRole("admin"), shopeeController.saveConfig);
router.get("/shopee/status", shopeeController.getStatus);

// ── Shopee Ações ──────────────────────────────────────────────────────────────
router.post("/shopee/sync", authorizeRole("admin", "manager"), shopeeController.syncProducts);
router.get("/shopee/export", shopeeController.exportCsv);
router.get("/shopee/logs", shopeeController.getLogs);
router.post("/shopee/sync-stock", authorizeRole("admin", "manager", "operator"), shopeeController.syncStock);

// ── Mock Adapter Routes (development/testing) ────────────────────────────────────
router.get("/mock/status", async (req, res) => {
  try {
    const adapter = marketplaceService.getAdapter("mock");
    if (!adapter) {
      return res.status(404).json({ success: false, error: { message: "Mock adapter not registered" } });
    }
    const status = await adapter.getStatus();
    return res.json({
      success: true,
      data: { mock: process.env.MARKETPLACE_MOCK === "true", connected: status.connected },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
});

router.post("/mock/auth", async (req, res) => {
  try {
    const adapter = marketplaceService.getAdapter("mock");
    if (!adapter) {
      return res.status(404).json({ success: false, error: { message: "Mock adapter not registered" } });
    }
    const { clientId, redirectUri } = req.body;
    const { url, state } = await adapter.authorize({ clientId, redirectUri });
    return res.json({ success: true, data: { authUrl: url, state } });
  } catch (err) {
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
});

router.get("/mock/products", async (req, res) => {
  try {
    const adapter = marketplaceService.getAdapter("mock");
    if (!adapter) {
      return res.status(404).json({ success: false, error: { message: "Mock adapter not registered" } });
    }
    const { page, limit } = req.query;
    const result = await adapter.listProducts({ page: parseInt(page) || 1, limit: parseInt(limit) || 10 });
    return res.json({ success: true, data: result });
  } catch (err) {
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
});

router.post("/mock/orders", async (req, res) => {
  try {
    const adapter = marketplaceService.getAdapter("mock");
    if (!adapter) {
      return res.status(404).json({ success: false, error: { message: "Mock adapter not registered" } });
    }
    const { status } = req.body;
    const result = await adapter.listOrders({ status });
    return res.json({ success: true, data: result });
  } catch (err) {
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
});

router.post("/mock/stock/update", async (req, res) => {
  try {
    const adapter = marketplaceService.getAdapter("mock");
    if (!adapter) {
      return res.status(404).json({ success: false, error: { message: "Mock adapter not registered" } });
    }
    const { productId, quantity } = req.body;
    try {
      const result = await adapter.updateStock(productId, quantity);
      return res.json({ success: true, data: result });
    } catch (err) {
      return res.status(404).json({ success: false, error: { message: err.message } });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
});

router.post("/mock/webhook", async (req, res) => {
  try {
    const adapter = marketplaceService.getAdapter("mock");
    if (!adapter) {
      return res.status(404).json({ success: false, error: { message: "Mock adapter not registered" } });
    }
    const result = await adapter.webhookHandler(req.body);
    return res.json({ success: true, data: result });
  } catch (err) {
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
});

router.post("/mock/disconnect", async (req, res) => {
  try {
    const adapter = marketplaceService.getAdapter("mock");
    if (!adapter) {
      return res.status(404).json({ success: false, error: { message: "Mock adapter not registered" } });
    }
    if (typeof adapter.disconnect === "function") {
      await adapter.disconnect();
    } else if (typeof adapter.resetMock === "function") {
      adapter.resetMock();
    }
    return res.json({ success: true, data: { message: "Mock disconnected" } });
  } catch (err) {
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// ── Status geral ──────────────────────────────────────────────────────────────
router.get("/status", async (req, res) => {
  try {
    const adapters = await marketplaceService.listAdapters();
    const integrations = adapters.map((a) => ({
      name: a.name,
      connected: a.connected,
      status: a.status,
    }));
    return res.json({ success: true, data: { integrations } });
  } catch (err) {
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
});

router.get("/", authorizeRole("admin", "manager"), (req, res) => {
  return res.json({ success: true, data: { message: "Módulo de marketplaces." } });
});

// ── LojeXa Hub Routes ───────────────────────────────────────────────────────
router.post('/lojexa/sync', authorizeRole('admin', 'manager'), async (req, res) => {
  try {
    const result = await syncErpToLojeXa(req.body.productIds || []);
    return res.json({ success: true, data: result });
  } catch (err) {
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
});

router.post('/lojexa/products', authorizeRole('admin', 'manager'), async (req, res) => {
  try {
    const result = await fetchLojeXaProducts(req.query.page, req.query.limit);
    return res.json({ success: true, data: result });
  } catch (err) {
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
});

router.post('/lojexa/stock', authorizeRole('admin', 'manager'), async (req, res) => {
  try {
    const result = await fetchLojeXaStockBySku(req.query.sku);
    return res.json({ success: true, data: result });
  } catch (err) {
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
});

router.post('/lojexa/sale', authorizeRole('admin', 'manager'), async (req, res) => {
  try {
    const result = await reportSaleLojeXa(req.body);
    return res.json({ success: true, data: result });
  } catch (err) {
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// ── Shopee Routes ──────────────────────────────────────────────────────────────
router.post('/shopee/auth-url', authorizeRole('admin', 'manager'), shopeeConnect);
router.post('/shopee/oauth/callback', authorizeRole('admin', 'manager'), shopeeHandleCallback);
router.post('/shopee/disconnect', authorizeRole('admin', 'manager'), shopeeController.disconnect);
router.post('/shopee/config', authorizeRole('admin'), shopeeController.saveConfig);
router.get('/shopee/status', shopeeGetStatus);
router.post('/shopee/sync', authorizeRole('admin', 'manager'), shopeeSync);
router.get('/shopee/export', shopeeController.exportCsv);
router.get('/shopee/logs', shopeeController.getLogs);
router.post('/shopee/sync-stock', authorizeRole('admin', 'manager', 'operator'), shopeeController.syncStock);

// ── Mercado Livre Routes ─────────────────────────────────────────────────────────
router.post('/ml/auth-url', authorizeRole('admin', 'manager'), mlConnect);
router.post('/ml/oauth/callback', authorizeRole('admin', 'manager'), mlHandleCallback);
router.post('/ml/disconnect', authorizeRole('admin', 'manager'), async (req, res) => {
  return res.json({ success: true, data: { message: 'Mercado Livre disconnected' } });
});
router.post('/ml/config', authorizeRole('admin'), async (req, res) => {
  return res.json({ success: true, data: { message: 'Config saved' } });
});
router.get('/ml/status', mlGetStatus);
router.post('/ml/sync', authorizeRole('admin', 'manager'), mlSync);
router.get('/ml/products', async (req, res) => {
  return res.json({ success: true, data: { items: [], total: 0 } });
});

// ── Dashboard de Marketplaces ───────────────────────────────────────────────────
router.get('/dashboard-status', authorizeRole('admin', 'manager'), async (req, res) => {
  try {
    const [shopeeStatus, mlStatus] = await Promise.all([
      shopeeIsConnected(),
      mlIsConnected(),
    ]);

    return res.json({
      success: true,
      data: {
        shopee: { connected: shopeeStatus.connected, shopId: shopeeStatus.shopId },
        ml: { connected: mlStatus.connected, shopId: mlStatus.shopId },
        lojexa: { connected: false },
        syncEnabled: shopeeStatus.connected || mlStatus.connected,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
});

export default router;
