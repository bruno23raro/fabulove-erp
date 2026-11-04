/**
 * LojeXa Controller — API endpoints for LojeXa integration
 *
 * Routes:
 *   GET /api/lojexa/validate?sku=XXXXX - Validate if SKU exists in ERP
 *   GET /api/lojexa/stock?sku=XXXXX - Get stock from LojeXa for a SKU
 *   POST /api/lojexa/sync/:productId - Sync stock to LojeXa
 *   GET /api/lojexa/divergent - List SKUs with divergent stock
 *   GET /api/lojexa/company - Get company info from LojeXa
 *   GET /api/lojexa/status - Get integration status
 */

import { LojeXaService } from '../services/lojexa.service.js';

/**
 * GET /api/lojexa/validate?sku=XXXXX
 * Validate if a SKU exists in ERP and is active
 */
export async function validateSku(req, res, next) {
  try {
    const { sku } = req.query;

    if (!sku) {
      return res.status(400).json({
        success: false,
        error: { message: 'SKU parameter is required', code: 'MISSING_SKU' }
      });
    }

    const result = await LojeXaService.validateSku(sku);
    return res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/lojexa/stock?sku=XXXXX
 * Get stock information from LojeXa for a specific SKU
 */
export async function getLojeXaStock(req, res, next) {
  try {
    const { sku } = req.query;

    if (!sku) {
      return res.status(400).json({
        success: false,
        error: { message: 'SKU parameter is required' }
      });
    }

    const result = await LojeXaService.getLojeXaStock(sku);
    return res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/lojexa/divergent
 * List all SKUs where ERP stock differs from LojeXa
 */
export async function getDivergentSkus(req, res, next) {
  try {
    const divergent = await LojeXaService.findDivergentSkus();
    return res.json({
      success: true,
      data: {
        divergent,
        count: divergent.length
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/lojexa/sync/:productId
 * Sync stock for a specific product to LojeXa
 * Query params: dryRun=true|false (default: true)
 */
export async function syncStock(req, res, next) {
  try {
    const { productId } = req.params;
    const { dryRun = 'true', reason } = req.query;

    const result = await LojeXaService.syncStockToLojeXa(productId, {
      dryRun: dryRun === 'true',
      reason
    });

    if (result.dryRun && result.success) {
      return res.json({
        success: true,
        data: result,
        warning: 'Dry run mode - no actual sync performed'
      });
    }

    return res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/lojexa/full-sync
 * Full stock synchronization with LojeXa
 * Query params: dryRun=true|false (default: true), reportOnly=true|false
 */
export async function fullSync(req, res, next) {
  try {
    const { dryRun = 'true', reportOnly = 'false' } = req.query;

    const result = await LojeXaService.fullSync({
      dryRun: dryRun === 'true',
      reportOnly: reportOnly === 'true'
    });

    return res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/lojexa/company
 * Get company information from LojeXa
 */
export async function getCompanyInfo(req, res, next) {
  try {
    const result = await LojeXaService.getCompanyInfo();
    return res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/lojexa/status
 * Get integration status
 */
export async function getStatus(req, res, next) {
  try {
    console.log('[LojeXa] getStatus called from:', req.path);
    const result = await LojeXaService.getStatus();
    console.log('[LojeXa] getStatus result:', result);
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('[LojeXa] getStatus error:', error);
    next(error);
  }
}

/**
 * GET /api/lojexa/products
 * List products from LojeXa (paginated)
 */
export async function listProducts(req, res, next) {
  try {
    const { page = 1, limit = 100 } = req.query;
    const result = await LojeXaService.listLojeXaProducts({
      page: parseInt(page),
      limit: parseInt(limit)
    });
    return res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}