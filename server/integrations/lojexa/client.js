/**
 * LojeXa HTTP Client — API wrapper with retry, rate limiting, and HMAC auth
 *
 * Features:
 * - Exponential backoff retry with jitter (max 3 attempts)
 * - Rate limiting respect (429 Retry-After header)
 * - AbortController for request cancellation
 * - Safe credential handling (never logs secrets)
 *
 * Architecture: ERP ↔ LojeXa Hub ↔ Marketplaces (Shopee, Mercado Livre, etc.)
 */

import crypto from 'node:crypto';

/**
 * @typedef {Object} LojeXaClientOptions
 * @property {string} apiKey - LojeXa API key
 * @property {string} webhookSecret - Webhook signing secret
 * @property {string} [baseUrl='https://lojexa.com/api/v1'] - API base URL
 * @property {number} [maxRetries=3] - Maximum retry attempts
 * @property {number} [baseDelay=1000] - Base delay in ms for exponential backoff
 */

export class LojeXaClient {
  #apiKey;
  #webhookSecret;
  #baseUrl;
  #maxRetries = 3;
  #baseDelay = 1000; // 1 second

  /**
   * @param {LojeXaClientOptions} options
   */
  constructor({ apiKey, webhookSecret, baseUrl = 'https://lojexa.com/api/v1', maxRetries = 3, baseDelay = 1000 }) {
    if (!apiKey || apiKey.length < 10) {
      throw new Error('LOJEXA_API_KEY must be at least 10 characters');
    }
    if (!webhookSecret || webhookSecret.length < 10) {
      throw new Error('LOJEXA_WEBHOOK_SECRET must be at least 10 characters');
    }
    this.#apiKey = apiKey;
    this.#webhookSecret = webhookSecret;
    this.#baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.#maxRetries = maxRetries;
    this.#baseDelay = baseDelay;
  }

  /**
   * Get headers with authorization
   * @returns {Object}
   */
  #getHeaders() {
    return {
      'Authorization': `Bearer ${this.#apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'SIZEN-ERP/1.0',
    };
  }

  /**
   * Calculate exponential backoff with jitter
   * @param {number} attempt - Current attempt number (0-indexed)
   * @returns {number} Delay in milliseconds
   */
  #calculateBackoff(attempt) {
    // Exponential: baseDelay * 2^attempt, with jitter (±25%)
    const exponentialDelay = this.#baseDelay * Math.pow(2, attempt);
    const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);
    return Math.max(0, Math.round(exponentialDelay + jitter));
  }

  /**
   * Make HTTP request with retry, rate limiting handling, and abort support
   * @param {string} path - API endpoint path
   * @param {Object} options - Fetch options
   * @param {AbortSignal} [options.signal] - Abort signal for cancellation
   * @returns {Promise<any>}
   */
  async request(path, options = {}) {
    const url = `${this.#baseUrl}${path}`;
    const { signal, ...fetchOptions } = options;
    const headers = { ...this.#getHeaders(), ...fetchOptions.headers };

    let lastError;

    for (let attempt = 0; attempt < this.#maxRetries; attempt++) {
      try {
        const response = await fetch(url, { ...fetchOptions, headers, signal });

        // Handle rate limiting (429)
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const delay = retryAfter && !isNaN(parseInt(retryAfter, 10))
            ? parseInt(retryAfter, 10) * 1000
            : this.#calculateBackoff(attempt);

          console.warn(`[LojeXa] Rate limited, waiting ${delay}ms before retry (attempt ${attempt + 1}/${this.#maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          throw new Error('Rate limited');
        }

        if (!response.ok) {
          let errorBody;
          try {
            errorBody = await response.json();
          } catch {
            errorBody = { message: await response.text() };
          }
          throw new Error(errorBody.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        // Handle abort
        if (error.name === 'AbortError') {
          throw new Error('Request cancelled', { cause: error });
        }

        lastError = error;

        // Don't retry on 4xx errors (except 429)
        if (error.message !== 'Rate limited' && !error.message.includes('HTTP 4')) {
          if (attempt < this.#maxRetries - 1) {
            const delay = this.#calculateBackoff(attempt);
            console.warn(`[LojeXa] Request failed (attempt ${attempt + 1}/${this.#maxRetries}), retrying in ${delay}ms: ${error.message}`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
    }

    throw lastError;
  }

  /**
   * Validate webhook signature (HMAC-SHA256)
   * LOJEXA sends signature in X-Signature header
   * Supports both 'sha256=' and 'hex=' formats
   * @param {string} payload - Raw payload string
   * @param {string} signature - Signature from X-Signature header
   * @returns {boolean}
   */
  validateWebhookSignature(payload, signature) {
    if (!signature || !payload) return false;

    const expectedSignature = crypto
      .createHmac('sha256', this.#webhookSecret)
      .update(payload)
      .digest('hex');

    // Support both 'sha256=' and 'hex=' formats
    const providedSignature = signature.replace(/^(sha256=|hex=)/, '');

    try {
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(providedSignature, 'hex')
      );
    } catch {
      return false;
    }
  }

  /**
   * Generate signature for outgoing webhook responses
   * @param {string} payload - Payload to sign
   * @returns {string} Signature in 'sha256=...' format
   */
  generateSignature(payload) {
    const signature = crypto
      .createHmac('sha256', this.#webhookSecret)
      .update(payload)
      .digest('hex');
    return `sha256=${signature}`;
  }

  // Health check - returns company info
  async ping() {
    return this.request('/ping');
  }

  // Get available channels/providers
  async getChannels() {
    return this.request('/channels');
  }

  // Get products from LojeXa
  async getProducts({ page = 1, limit = 100 } = {}) {
    const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
    return this.request(`/products?${params.toString()}`);
  }

  // Get stock for a specific SKU
  async getStockBySku(sku) {
    return this.request(`/stock/${encodeURIComponent(sku)}`);
  }

  // Update stock for a product
  async updateStock(sku, quantity, { idempotent = true } = {}) {
    return this.request(`/stock/${encodeURIComponent(sku)}`, {
      method: 'POST',
      body: JSON.stringify({ quantity, idempotent }),
    });
  }

  // Get orders from LojeXa
  async getOrders({ status, dateFrom, dateTo, page = 1, limit = 100 } = {}) {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    return this.request(`/orders?${params.toString()}`);
  }

  // Report a sale (write:sales capability)
  async reportSale(saleData) {
    return this.request('/sales', {
      method: 'POST',
      body: JSON.stringify(saleData),
    });
  }

  // Get usage info (rate limits, etc.)
  async getUsage() {
    return this.request('/usage');
  }

  // Get connected stores
  async getStores() {
    return this.request('/stores');
  }

  // Get integration status
  async getStatus() {
    return this.request('/status');
  }
}

/**
 * Create authenticated LojeXa client from environment variables
 * @returns {LojeXaClient|null}
 */
export function createLojeXaClient() {
  const apiKey = process.env.LOJEXA_API_KEY;
  const webhookSecret = process.env.LOJEXA_WEBHOOK_SECRET;
  const baseUrl = process.env.LOJEXA_BASE_URL;

  if (!apiKey || apiKey === 'lj_live_xxxxxxxxxxxxxxxxxxxxxxxx') {
    console.warn('[LojeXa] API key not configured or using placeholder');
    return null;
  }

  if (!webhookSecret || webhookSecret === 'whsec_xxxxxxxxxxxxxxxxxxxxxxxx') {
    console.warn('[LojeXa] Webhook secret not configured or using placeholder');
    return null;
  }

  return new LojeXaClient({
    apiKey,
    webhookSecret,
    baseUrl,
  });
}