/**
 * Shopee Adapter — Real Implementation using shopee-api
 *
 * References:
 * - https://open.shopee.com/documents
 * - OAuth 2.0 Partner flow: https://open.shopee.com/documents?module=99&type=2&id=593
 * - Package: https://github.com/lkloon123/shopee-api
 */

import crypto from 'node:crypto';
import ShopeeApi from 'shopee-api';

const SHOPEE_AUTH_URL_BASE = 'https://partner.shopeemobile.com/api/v1/shop/auth_partner';

/** Shopee Adapter — implements MarketplaceAdapter interface */
export class ShopeeAdapter {
  /** @type {number|null} */
  partnerId = process.env.SHOPEE_PARTNER_ID ? Number(process.env.SHOPEE_PARTNER_ID) : null;
  /** @type {string|null} */
  partnerKey = process.env.SHOPEE_PARTNER_KEY || null;
  /** @type {string|null} */
  redirectUri = process.env.SHOPEE_REDIRECT_URI || 'http://localhost:3000/api/marketplaces/shopee/oauth/callback';
  /** @type {string|null} */
  webhookUrl = process.env.SHOPEE_WEBHOOK_URL || null;
  /** @type {number|null} */
  shopId = null;
  /** @type {object|null} */
  tokens = null;
  /** @type {ShopeeApi|null} */
  sdkClient = null;

  /**
   * Initialize SDK client
   */
  _initClient() {
    if (!this.sdkClient) {
      this.sdkClient = new ShopeeApi({
        partner_id: this.partnerId,
        partner_key: this.partnerKey,
        redirect_uri: this.redirectUri,
        webhook_url: this.webhookUrl,
        isUAT: process.env.SHOPEE_IS_UAT === 'true',
        verbose: process.env.SHOPEE_VERBOSE === 'true',
      });
    }
    return this.sdkClient;
  }

  /**
   * Get authorization URL for OAuth flow
   * @param {object} params
   * @returns {Promise<{url: string, state: string}>}
   */
  async authorize({ partnerId, partnerKey, redirectUri, shopId } = {}) {
    if (partnerId) this.partnerId = Number(partnerId);
    if (partnerKey) this.partnerKey = partnerKey;
    if (redirectUri) this.redirectUri = redirectUri;
    if (shopId) this.shopId = Number(shopId);

    if (!this.partnerId || !this.partnerKey) {
      throw new Error('SHOPEE_PARTNER_ID e SHOPEE_PARTNER_KEY não configurados. Crie um Partner App em https://open.shopee.com');
    }

    const state = crypto.randomBytes(16).toString('hex');

    // Shopee uses partner_key + redirect_uri hash for token
    const token = crypto
      .createHash('sha256')
      .update(this.partnerKey + this.redirectUri)
      .digest('hex');

    const url = `${SHOPEE_AUTH_URL_BASE}?id=${this.partnerId}&token=${token}&redirect=${encodeURIComponent(this.redirectUri)}`;

    return { url, state };
  }

  /**
   * Handle OAuth callback — exchange code for tokens
   * @param {string} code
   * @param {string} _state
   * @returns {Promise<{accessToken: string, expiresIn: number, refreshToken: string, shopId: number}>}
   */
  async callbackHandler(code, _state) {
    if (!code) throw new Error('Authorization code is required');

    try {
      const client = this._initClient();
      if (this.shopId) {
        client.config.shopid = this.shopId;
      }

      // Get access token using Shopee API
      const response = await client.post('/auth/token/get', {
        code,
        shop_id: this.shopId,
      });

      const { access_token, refresh_token, expires_in, shopid } = response.body;

      this.tokens = {
        access_token,
        refresh_token,
        expires_in,
        shop_id: shopid,
      };
      this.shopId = shopid;

      return {
        accessToken: this.tokens.access_token,
        expiresIn: this.tokens.expires_in,
        refreshToken: this.tokens.refresh_token,
        shopId: this.shopId,
      };
    } catch (err) {
      console.error('[shopee-adapter] Error in callbackHandler:', err.message);
      throw new Error(`Falha ao obter tokens: ${err.message}`, { cause: err });
    }
  }

  /**
   * Refresh access token
   * @param {object} params
   * @returns {Promise<{accessToken: string, expiresIn: number, refreshToken?: string}>}
   */
  async refreshToken({ refreshToken } = {}) {
    const client = this._initClient();
    const token = refreshToken || this.tokens?.refresh_token;

    if (!token || !this.shopId) {
      throw new Error('Refresh token or shop ID not available');
    }

    try {
      const response = await client.post('/auth/access_token/get', {
        refresh_token: token,
        shop_id: this.shopId,
      });

      const { access_token, refresh_token, expires_in } = response.body;

      this.tokens = {
        access_token,
        refresh_token: refresh_token || token,
        expires_in,
        shop_id: this.shopId,
      };

      return {
        accessToken: this.tokens.access_token,
        expiresIn: this.tokens.expires_in,
        refreshToken: this.tokens.refresh_token,
      };
    } catch (err) {
      console.error('[shopee-adapter] Error refreshing token:', err.message);
      throw new Error(`Falha ao renovar token: ${err.message}`, { cause: err });
    }
  }

  /**
   * List products from Shopee
   * @param {object} params
   * @returns {Promise<{items: Array, total: number, page: number}>}
   */
  async listProducts({ page = 1, limit = 50, status = 'NORMAL' } = {}) {
    if (!this.tokens?.access_token || !this.shopId) {
      throw new Error('Not connected. Run OAuth flow first.');
    }

    try {
      const client = this._initClient();
      client.config.shopid = this.shopId;

      const offset = (page - 1) * limit;
      const response = await client.post('/product/get_item_list', {
        offset,
        page_size: limit,
        item_status: status,
      });

      const items = response.body?.response?.item || [];

      return {
        items: items.map(item => ({
          id: item.item_id,
          title: item.item_name,
          price: item.price ? item.price / 100000 : 0, // Shopee price in 100000 units
          stock: item.normal_stock,
          status: item.item_status,
          image: item.image?.image_url_list?.[0] || '',
          category_id: item.category_id,
          create_time: item.create_time,
          update_time: item.update_time,
        })),
        total: response.body?.response?.total_count || items.length,
        page,
      };
    } catch (err) {
      console.error('[shopee-adapter] Error listing products:', err.message);
      throw new Error(`Falha ao listar produtos: ${err.message}`, { cause: err });
    }
  }

  /**
   * Push product to Shopee
   * @param {object} product
   * @returns {Promise<{remoteId: string, status: string}>}
   */
  async pushProduct(product) {
    if (!this.tokens?.access_token || !this.shopId) {
      throw new Error('Not connected. Run OAuth flow first.');
    }

    try {
      const client = this._initClient();
      client.config.shopid = this.shopId;

      // Build item payload per Shopee API
      const itemData = {
        item_name: product.title || product.name,
        category_id: product.category_id || 0,
        description: product.description || '',
        price_list: [{
          original_price: Math.round((Number(product.price) || 0) * 100000), // Convert to 100000 units
          currency: 'BRL',
        }],
        stock_list: [{
          normal_stock: Number(product.stock) || 0,
        }],
        weight: product.weight || 0,
        dimension: product.dimension || { length: 10, width: 10, height: 5 },
        logistics_id: product.logistics_id || [],
        images: product.images?.map(img => ({ image_url: img })) || [],
        attribute_list: product.attributes || [],
        size_chart: product.size_chart || '',
        condition: product.condition || 'NEW',
        brand: product.brand || '',
      };

      const response = await client.post('/product/add_item', itemData);

      return {
        remoteId: String(response.body?.response?.item_id),
        status: 'published',
        item_name: response.body?.response?.item_name,
      };
    } catch (err) {
      console.error('[shopee-adapter] Error pushing product:', err.message);
      throw new Error(`Falha ao publicar produto: ${err.message}`, { cause: err });
    }
  }

  /**
   * List orders from Shopee
   * @param {object} params
   * @returns {Promise<{orders: Array, total: number}>}
   */
  async listOrders({ status, _page = 1, limit = 50, timeFrom, timeTo } = {}) {
    if (!this.tokens?.access_token || !this.shopId) {
      throw new Error('Not connected. Run OAuth flow first.');
    }

    try {
      const client = this._initClient();
      client.config.shopid = this.shopId;

      const timeRange = timeFrom ? timeFrom : Math.floor(Date.now() / 1000) - 86400 * 30; // Last 30 days
      const timeToRange = timeTo ? timeTo : Math.floor(Date.now() / 1000);

      const response = await client.post('/order/get_order_list', {
        time_range_field: 'create_time',
        time_from: timeRange,
        time_to: timeToRange,
        page_size: limit,
        cursor: '',
        order_status: status || 'READY_TO_SHIP',
      });

      const orders = response.body?.response?.order_list || [];

      return {
        orders: orders.map(order => ({
          id: order.order_sn,
          order_sn: order.order_sn,
          status: order.order_status,
          create_time: order.create_time,
          update_time: order.update_time,
          total_amount: order.total_amount / 100000,
          buyer_user_id: order.buyer_user_id,
          recipient_address: order.recipient_address,
          items: order.item_list?.map(item => ({
            item_id: item.item_id,
            item_name: item.item_name,
            model_id: item.model_id,
            model_name: item.model_name,
            model_quantity_purchased: item.model_quantity_purchased,
            model_original_price: item.model_original_price / 100000,
            model_discounted_price: item.model_discounted_price / 100000,
          })) || [],
          payment_method: order.payment_method,
          logistics_status: order.logistics_status,
        })),
        total: response.body?.response?.total_count || orders.length,
        nextCursor: response.body?.response?.next_cursor,
      };
    } catch (err) {
      console.error('[shopee-adapter] Error listing orders:', err.message);
      throw new Error(`Falha ao listar pedidos: ${err.message}`, { cause: err });
    }
  }

  /**
   * Update stock on Shopee
   * @param {string} productId
   * @param {number} quantity
   * @returns {Promise<{success: boolean}>}
   */
  async updateStock(productId, quantity) {
    if (!this.tokens?.access_token || !this.shopId) {
      throw new Error('Not connected. Run OAuth flow first.');
    }

    try {
      const client = this._initClient();
      client.config.shopid = this.shopId;

      await client.post('/product/update_stock', {
        item_id: productId,
        stock_list: [{
          normal_stock: Math.max(0, quantity),
        }],
      });

      return { success: true };
    } catch (err) {
      console.error('[shopee-adapter] Error updating stock:', err.message);
      throw new Error(`Falha ao atualizar estoque: ${err.message}`, { cause: err });
    }
  }

  /**
   * Handle Shopee webhook
   * @param {object} payload
   * @param {string} signature
   * @returns {Promise<{event: string, data: object}>}
   */
  async webhookHandler(payload, signature) {
    const client = this._initClient();
    const params = JSON.stringify(payload);

    // Validate signature
    const isValid = client.isValidSignature(params, signature);

    if (!isValid) {
      console.warn('[shopee-adapter] Invalid webhook signature');
      throw new Error('Invalid webhook signature');
    }

    // Shopee webhook types: order.create, order.update, item.update, etc.
    const event = payload?.code || 'unknown';

    return {
      event,
      data: payload || {},
      receivedAt: new Date().toISOString(),
    };
  }

  /**
   * Get connection status
   * @returns {Promise<{connected: boolean, lastSync: string|null, errors: Array<string>}>}
   */
  async getStatus() {
    return {
      connected: !!this.tokens?.access_token && !!this.shopId,
      lastSync: this.lastSyncAt || null,
      errors: (this.tokens?.access_token && this.shopId) ? [] : ['Não conectado — execute OAuth'],
      shopId: this.shopId,
    };
  }

  /** Set last sync time */
  setLastSync(timestamp) {
    this.lastSyncAt = timestamp || new Date().toISOString();
  }
}

export default ShopeeAdapter;