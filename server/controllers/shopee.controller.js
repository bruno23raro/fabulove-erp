/**
 * Controller Shopee — integração com marketplace
 *
 * Rotas:
 *   POST /api/marketplaces/shopee/config     — salvar credenciais
 *   GET  /api/marketplaces/shopee/status     — status configuração
 *   POST /api/marketplaces/shopee/sync       — sincronizar produtos
 *   GET  /api/marketplaces/shopee/export     — exportar CSV
 *   GET  /api/marketplaces/shopee/logs       — logs de sincronização
 */

import { ShopeeService } from '../services/shopee.service.js';

export const saveConfig = async (req, res, next) => {
  try {
    const { apiKey, apiSecret, shopId, partnerId, syncEnabled } = req.body;
    if (!apiKey || !apiSecret) {
      return res.status(400).json({ success: false, error: { message: 'apiKey e apiSecret são obrigatórios.' } });
    }
    await ShopeeService.saveConfig({ apiKey, apiSecret, shopId, partnerId, syncEnabled: !!syncEnabled });
    return res.json({ success: true, data: { message: 'Credenciais salvas com sucesso.' } });
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
    const result = await ShopeeService.syncProductsFromShopee();
    return res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const exportCsv = async (req, res, next) => {
  try {
    const csv = await ShopeeService.exportCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="produtos-shopee.csv"');
    return res.send(csv);
  } catch (err) {
    next(err);
  }
};

export const getLogs = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const logs = await ShopeeService.listLogs(limit);
    return res.json({ success: true, data: logs });
  } catch (err) {
    next(err);
  }
};

export const syncStock = async (req, res, next) => {
  try {
    const { productId, quantitySold } = req.body;
    if (!productId) {
      return res.status(400).json({ success: false, error: { message: 'productId é obrigatório.' } });
    }
    const result = await ShopeeService.syncStock(productId, quantitySold || 1);
    return res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};
