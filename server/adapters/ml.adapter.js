/**
 * Mercado Livre Adapter — Skeleton
 *
 * Implementação do Mercado Livre OAuth 2.0.
 * Métodos marcados como TODO para plugar quando credenciais disponíveis.
 *
 * Referências:
 * - https://developers.mercadolivre.com.br
 * - OAuth: https://developers.mercadolivre.com.br/pt_br/autenticacao-e-autorizacao
 */

import crypto from 'node:crypto';

const ML_AUTH_URL = 'https://auth.mercadolibre.com/authorization';
const ML_TOKEN_URL = 'https://api.mercadolibre.com/oauth/token';
const ML_API_BASE = 'https://api.mercadolibre.com';

const ML_SCOPES = ['offline_access', 'read', 'write'];

/** Mercado Livre Adapter — implements MarketplaceAdapter interface */
export class MercadoLivreAdapter {
  /** @type {string|null} */
  clientId = process.env.ML_CLIENT_ID || null;
  /** @type {string|null} */
  clientSecret = process.env.ML_CLIENT_SECRET || null;
  /** @type {string|null} */
  redirectUri = process.env.ML_REDIRECT_URI || 'http://localhost:3000/api/marketplaces/ml/oauth/callback';
  /** @type {object|null} */
  tokens = null;
  /** @type {string|null} */
  sellerId = null;

  /**
   * Get authorization URL for OAuth flow
   * @param {object} params
   * @returns {Promise<{url: string}>}
   */
  async authorize({ clientId, clientSecret, redirectUri, scope } = {}) {
    if (clientId) this.clientId = clientId;
    if (clientSecret) this.clientSecret = clientSecret;
    if (redirectUri) this.redirectUri = redirectUri;

    if (!this.clientId) {
      throw new Error('ML_CLIENT_ID não configurado. Crie um app em https://developers.mercadolivre.com.br');
    }

    const state = crypto.randomBytes(16).toString('hex');
    const scopes = (scope || ML_SCOPES).join(' ');
    const redirect = redirectUri || this.redirectUri;
    const encodedRedirect = encodeURIComponent(redirect);
    const url = `${ML_AUTH_URL}?client_id=${this.clientId}&redirect_uri=${encodedRedirect}&response_type=code&state=${state}&scope=${encodeURIComponent(scopes)}`;

    return { url, state };
  }

  /**
   * Handle OAuth callback
   * TODO: Implementar troca de code por tokens
   * @param {string} code
   * @param {string} state
   * @returns {Promise<{accessToken: string, expiresIn: number}>}
   */
  async callbackHandler(code, state) {
    if (!code) throw new Error('Authorization code is required');
    console.warn('[ml-adapter] TODO: Implementar callbackHandler com ML API');

    // Placeholder — substituir por chamada real à ML API
    this.tokens = {
      access_token: `ml_access_${Date.now()}`,
      refresh_token: `ml_refresh_${Date.now()}`,
      expires_in: 6 * 60 * 60,
      scope: 'read write offline_access',
    };

    return {
      accessToken: this.tokens.access_token,
      expiresIn: this.tokens.expires_in,
      refreshToken: this.tokens.refresh_token,
    };
  }

  /**
   * Refresh access token
   * TODO: Implementar refresh com ML API
   * @param {object} params
   * @returns {Promise<{accessToken: string, expiresIn: number}>}
   */
  async refreshToken({ refreshToken } = {}) {
    console.warn('[ml-adapter] TODO: Implementar refreshToken com ML API');
    // Placeholder
    return {
      accessToken: `ml_access_${Date.now()}`,
      expiresIn: 21600,
      refreshToken: refreshToken || `ml_refresh_${Date.now()}`,
    };
  }

  /**
   * List products from Mercado Livre
   * TODO: Implementar com ML API /items/search
   * @param {object} params
   * @returns {Promise<{items: Array, total: number, page: number}>}
   */
  async listProducts({ page = 1, limit = 50 } = {}) {
    console.warn('[ml-adapter] TODO: Implementar listProducts com ML API');
    return { items: [], total: 0, page };
  }

  /**
   * Push product to Mercado Livre
   * TODO: Implementar com ML API /items POST
   * @param {object} product
   * @returns {Promise<{remoteId: string, status: string}>}
   */
  async pushProduct(product) {
    console.warn('[ml-adapter] TODO: Implementar pushProduct com ML API');
    return { remoteId: `ML-${Date.now()}`, status: 'pending' };
  }

  /**
   * List orders from Mercado Livre
   * TODO: Implementar com ML API /orders/search
   * @param {object} params
   * @returns {Promise<{orders: Array, total: number}>}
   */
  async listOrders({ status, page = 1 } = {}) {
    console.warn('[ml-adapter] TODO: Implementar listOrders com ML API');
    return { orders: [], total: 0 };
  }

  /**
   * Update stock on Mercado Livre
   * TODO: Implementar com ML API /items/:id/purchase_options
   * @param {string} productId
   * @param {number} quantity
   * @returns {Promise<{success: boolean}>}
   */
  async updateStock(productId, quantity) {
    console.warn('[ml-adapter] TODO: Implementar updateStock com ML API');
    return { success: true };
  }

  /**
   * Handle Mercado Livre webhook
   * TODO: Implementar validação de assinatura ML
   * @param {object} payload
   * @param {string} signature
   * @returns {Promise<{event: string, data: object}>}
   */
  async webhookHandler(payload, signature) {
    console.warn('[ml-adapter] TODO: Implementar webhookHandler com validação de assinatura');
    return {
      event: payload?.type || 'unknown',
      data: payload || {},
    };
  }

  /**
   * Get connection status
   * @returns {Promise<{connected: boolean, lastSync: string|null, errors: Array<string>}>}
   */
  async getStatus() {
    return {
      connected: !!this.tokens,
      lastSync: null,
      errors: this.tokens ? [] : ['Não conectado'],
    };
  }
}

export default MercadoLivreAdapter;
