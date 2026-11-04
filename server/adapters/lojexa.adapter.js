/**
 * LojeXa Adapter — Marketplace adapter via LojeXa Hub
 *
 * Connects to the LojeXa Hub platform which aggregates multiple marketplaces.
 * This adapter serves as the single integration point for Shopee, Mercado Livre,
 * and other supported marketplaces.
 *
 * Architecture: ERP ↔ LojeXa Hub ↔ Marketplaces
 *
 * @module LojeXaAdapter
 */

import { createLojeXaClient } from '../integrations/lojexa/index.js';

/**
 * LojeXa Adapter for marketplace.service.js
 */
export class LojeXaAdapter {
  #client;
  #config = {
    connected: false,
    lastSync: null,
    errors: [],
  };

  constructor() {
    this.#client = createLojeXaClient();
    if (this.#client) {
      this.#config.connected = true;
    }
  }

  /**
   * Authorize connection (returns connect URL)
   * Note: For LojeXa, this returns a placeholder - actual OAuth is handled by LojeXa Hub
   */
  async authorize(_params = {}) {
    if (!this.#client) {
      throw new Error('LojeXa not configured. Set LOJEXA_API_KEY and LOJEXA_WEBHOOK_SECRET');
    }

    // Get connect URL from LojeXa client
    const connectUrl = ''; // This would be built via buildConnectUrl
    return {
      url: connectUrl,
      state: crypto.randomUUID(),
    };
  }

  /**
   * Refresh token (not needed for LojeXa Hub API key auth)
   */
  async refreshToken(_params = {}) {
    if (!this.#client) {
      throw new Error('LojeXa not configured');
    }

    // LojeXa Hub uses API key auth, not OAuth tokens
    return {
      accessToken: process.env.LOJEXA_API_KEY,
      expiresIn: 3600,
    };
  }

  /**
   * List products from LojeXa-connected marketplaces
   */
  async listProducts(params = {}) {
    if (!this.#client) {
      throw new Error('LojeXa not configured');
    }

    const { page = 1, limit = 100 } = params;
    const result = await this.#client.getProducts({ page, limit });
    return {
      items: result?.products || [],
      total: result?.total || 0,
      page,
    };
  }

  /**
   * Push product to connected marketplaces
   */
  async pushProduct(product) {
    if (!this.#client) {
      throw new Error('LojeXa not configured');
    }

    // Update stock via LojeXa
    const result = await this.#client.updateStock(product.sku, product.stock);
    return {
      remoteId: product.sku,
      status: result?.success ? 'synced' : 'error',
    };
  }

  /**
   * List orders from connected marketplaces
   */
  async listOrders(params = {}) {
    if (!this.#client) {
      throw new Error('LojeXa not configured');
    }

    const { status, page = 1, limit = 100 } = params;
    const result = await this.#client.getOrders({ status, page, limit });
    return {
      orders: result?.orders || [],
      total: result?.total || 0,
    };
  }

  /**
   * Update stock on connected marketplaces
   */
  async updateStock(productId, quantity) {
    if (!this.#client) {
      throw new Error('LojeXa not configured');
    }

    // Find SKU by product ID in ERP database
    const pool = await import('../config/database.js').then(m => m.default);
    const { rows } = await pool.query(
      'SELECT sku FROM products WHERE id = $1',
      [productId]
    );

    if (!rows.length) {
      throw new Error('Product not found');
    }

    const result = await this.#client.updateStock(rows[0].sku, quantity);
    return {
      success: result?.success || false,
      remoteId: rows[0].sku,
    };
  }

  /**
   * Webhook handler
   */
  async webhookHandler(payload, signature) {
    if (!this.#client) {
      throw new Error('LojeXa not configured');
    }

    const isValid = this.#client.validateWebhookSignature(
      typeof payload === 'string' ? payload : JSON.stringify(payload),
      signature
    );

    if (!isValid) {
      throw new Error('Invalid webhook signature');
    }

    const event = typeof payload === 'string' ? JSON.parse(payload) : payload;
    return {
      event: event.event_type || 'unknown',
      data: event.data || event,
    };
  }

  /**
   * Get connection status
   */
  async getStatus() {
    if (!this.#client) {
      return {
        connected: false,
        lastSync: null,
        errors: ['LojeXa API key not configured'],
      };
    }

    try {
      const status = await this.#client.getStatus();
      return {
        connected: status?.configured || false,
        lastSync: this.#config.lastSync,
        errors: this.#config.errors,
      };
    } catch (err) {
      return {
        connected: false,
        lastSync: null,
        errors: [err.message],
      };
    }
  }
}

// Default export for async imports
export default LojeXaAdapter;