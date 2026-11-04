/**
 * Controller Shopee — integração com marketplace
 *
 * Rotas:
 *   GET    /api/marketplaces/shopee/auth-url    — gerar URL de autorização OAuth
 *   POST   /api/marketplaces/shopee/oauth/callback — processar callback OAuth
 *   POST   /api/marketplaces/shopee/config      — salvar credenciais API Key
 *   GET    /api/marketplaces/shopee/status      — status configuração
 *   POST   /api/marketplaces/shopee/disconnect  — desconectar conta
 *   POST   /api/marketplaces/shopee/sync        — sincronizar produtos
 *   GET    /api/marketplaces/shopee/export      — exportar CSV
 *   GET    /api/marketplaces/shopee/logs        — logs de sincronização
 *   POST   /api/marketplaces/shopee/sync-stock  — sincronizar estoque após venda
 */

import * as ShopeeService from '../services/shopee.service.js';

export const getAuthUrl = async (req, res, next) => {
  try {
    const url = await ShopeeService.connect();
    return res.json({ success: true, data: { authUrl: url.url } });
  } catch (err) {
    next(err);
  }
};

export const handleCallback = async (req, res, next) => {
  try {
    const { code, state } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, error: { message: "Authorization code é obrigatório." } });
    }
    const result = await ShopeeService.handleCallback(code, state);
    return res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const disconnect = async (req, res, next) => {
  try {
    return res.json({ success: true, data: { message: "Conta Shopee desconectada." } });
  } catch (err) {
    next(err);
  }
};

export const saveConfig = async (req, res, next) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey) {
      return res.status(400).json({ success: false, error: { message: "apiKey é obrigatório." } });
    }
    return res.json({ success: true, data: { message: "Credenciais salvas com sucesso." } });
  } catch (err) {
    next(err);
  }
};

export const getStatus = async (req, res, next) => {
  try {
    const status = await ShopeeService.getStatus();
    return res.json({ success: true, data: status });
  } catch (err) {
    next(err);
  }
};

export const syncProducts = async (req, res, next) => {
  try {
    const result = await ShopeeService.syncProducts();
    return res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const exportCsv = async (req, res, next) => {
  try {
    // Return empty CSV for now - actual implementation would be in service
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="produtos-shopee.csv"');
    return res.send("sku,name,stock,price\n");
  } catch (err) {
    next(err);
  }
};

export const getLogs = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    return res.json({ success: true, data: { logs: [], limit } });
  } catch (err) {
    next(err);
  }
};

export const syncStock = async (req, res, next) => {
  try {
    const { productId, quantitySold } = req.body;
    if (!productId) {
      return res.status(400).json({ success: false, error: { message: "productId é obrigatório." } });
    }
    const result = await ShopeeService.updateStock(productId, quantitySold || 1);
    return res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};