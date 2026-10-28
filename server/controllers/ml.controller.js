/**
 * Mercado Livre Controller — OAuth 2.0 + MarketplaceAdapter
 *
 * Endpoints:
 *   GET    /api/marketplaces/ml/status          — connection status
 *   POST   /api/marketplaces/ml/auth-url        — generate OAuth URL
 *   POST   /api/marketplaces/ml/callback        — handle OAuth callback
 *   POST   /api/marketplaces/ml/disconnect      — disconnect account
 *   POST   /api/marketplaces/ml/sync            — sync products to/from ML
 *   POST   /api/marketplaces/ml/push-product    — push a single product to ML
 *   GET    /api/marketplaces/ml/products        — list ML products
 *   GET    /api/marketplaces/ml/orders          — list ML orders
 *   POST   /api/marketplaces/ml/webhook         — ML webhook endpoint
 */

import { MercadoLivreAdapter } from '../adapters/ml.adapter.js';
import { sequelize } from '../config/database.js';
import { getAdapter, registerBuiltins } from '../services/marketplace.service.js';

const adapter = new MercadoLivreAdapter();

// ── Status ────────────────────────────────────────────────────────────────────
export const getStatus = async (_req, res, next) => {
  try {
    await registerBuiltins();
    const status = await adapter.getStatus();
    return res.json({ success: true, data: status });
  } catch (err) {
    next(err);
  }
};

// ── Auth URL ──────────────────────────────────────────────────────────────────
export const getAuthUrl = async (req, res, next) => {
  try {
    const { clientId, clientSecret, redirectUri } = req.body || {};
    if (clientId) adapter.clientId = clientId;
    if (clientSecret) adapter.clientSecret = clientSecret;
    if (redirectUri) adapter.redirectUri = redirectUri;

    const result = await adapter.authorize();
    return res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// ── Callback ──────────────────────────────────────────────────────────────────
export const handleCallback = async (req, res, next) => {
  try {
    const { code, state } = req.body || {};
    if (!code) {
      return res.status(400).json({ success: false, error: { message: 'Authorization code is required.' } });
    }

    const tokens = await adapter.callbackHandler(code, state);

    // Store tokens in marketplace_accounts table
    const [account] = await sequelize.query(
      `INSERT INTO marketplace_accounts (name, provider, access_token, refresh_token, token_expires_at, status, connected_at)
       VALUES ('Mercado Livre', 'ml', :access_token, :refresh_token, NOW() + INTERVAL '6 hours', 'connected', NOW())
       ON CONFLICT (name) DO UPDATE SET
         access_token = :access_token,
         refresh_token = :refresh_token,
         token_expires_at = NOW() + INTERVAL '6 hours',
         status = 'connected',
         connected_at = NOW(),
         updated_at = NOW()
       RETURNING id, name, provider, status, connected_at`,
      { replacements: { access_token: tokens.accessToken, refresh_token: tokens.refreshToken } }
    );

    return res.json({ success: true, data: { ...tokens, accountId: account[0]?.id } });
  } catch (err) {
    next(err);
  }
};

// ── Disconnect ────────────────────────────────────────────────────────────────
export const disconnect = async (_req, res, next) => {
  try {
    await sequelize.query(
      `UPDATE marketplace_accounts
       SET access_token = NULL, refresh_token = NULL, status = 'disconnected', updated_at = NOW()
       WHERE provider = 'ml'`
    );
    return res.json({ success: true, data: { message: 'Mercado Livre desconectado.' } });
  } catch (err) {
    next(err);
  }
};

// ── Sync Products ─────────────────────────────────────────────────────────────
export const syncProducts = async (req, res, next) => {
  try {
    const page = req.query.page ? parseInt(req.query.page, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;
    const result = await adapter.listProducts({ page, limit });

    // TODO: Upsert to local products table
    console.log(`[ml-sync] Found ${result.total} products on Mercado Livre`);

    return res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// ── Push Single Product ───────────────────────────────────────────────────────
export const pushProduct = async (req, res, next) => {
  try {
    const product = req.body;
    if (!product.title) {
      return res.status(400).json({ success: false, error: { message: 'Product title is required.' } });
    }

    const result = await adapter.pushProduct(product);
    return res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// ── List Products ─────────────────────────────────────────────────────────────
export const listProducts = async (req, res, next) => {
  try {
    const page = req.query.page ? parseInt(req.query.page, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;
    const result = await adapter.listProducts({ page, limit });
    return res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// ── List Orders ───────────────────────────────────────────────────────────────
export const listOrders = async (req, res, next) => {
  try {
    const page = req.query.page ? parseInt(req.query.page, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;
    const status = req.query.status || undefined;
    const result = await adapter.listOrders({ page, limit, status });
    return res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// ── Webhook ───────────────────────────────────────────────────────────────────
export const webhook = async (req, res, next) => {
  try {
    const payload = req.body;
    // ML webhooks don't use signature by default
    const result = await adapter.webhookHandler(payload, null);
    console.log(`[ml-webhook] Received event: ${result.event}`);
    return res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};
