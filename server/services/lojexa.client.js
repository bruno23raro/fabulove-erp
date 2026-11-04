/**
 * LojeXa HTTP Client — API wrapper with retry, rate limiting, and HMAC auth
 *
 * Features:
 * - Exponential backoff retry (max 3 attempts)
 * - Rate limiting respect (429 Retry-After)
 * - HMAC signature validation for webhooks
 * - Safe credential handling (never logs secrets)
 */

import crypto from 'node:crypto';

/**
 * Client for LojeXa API integration
 * Base URL: https://lojexa.com/api/v1
 * Auth: Bearer token in Authorization header
 */
export class LojeXaClient {
  #apiKey;
  #webhookSecret;
  #baseUrl;
  #maxRetries = 3;
  #baseDelay = 1000; // 1 second

  constructor(apiKey, webhookSecret, baseUrl = 'https://lojexa.com/api/v1') {
    if (!apiKey || !webhookSecret) {
      throw new Error('LOJEXA_API_KEY and LOJEXA_WEBHOOK_SECRET are required');
    }
    this.#apiKey = apiKey;
    this.#webhookSecret = webhookSecret;
    this.#baseUrl = baseUrl;
  }

  #getHeaders() {
    return {
      'Authorization': `Bearer ${this.#apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'SIZEN-ERP/1.0'
    };
  }

  /**
   * Make HTTP request with retry and rate limit handling
   */
  async request(path, options = {}) {
    const url = `${this.#baseUrl}${path}`;
    const headers = { ...this.#getHeaders(), ...options.headers };

    let lastError;

    for (let attempt = 0; attempt < this.#maxRetries; attempt++) {
      try {
        const response = await fetch(url, { ...options, headers });

        // Handle rate limiting (429)
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const delay = retryAfter
            ? parseInt(retryAfter, 10) * 1000
            : this.#baseDelay * Math.pow(2, attempt);

          console.warn(`[LojeXa] Rate limited, waiting ${delay}ms before retry (attempt ${attempt + 1})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          throw new Error('Rate limited');
        }

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        lastError = error;
        if (attempt < this.#maxRetries - 1) {
          const delay = this.#baseDelay * Math.pow(2, attempt);
          console.warn(`[LojeXa] Request failed (attempt ${attempt + 1}), retrying in ${delay}ms: ${error.message}`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  /**
   * Validate webhook signature (HMAC-SHA256)
   * LOJEXA sends signature in X-Signature header
   */
  validateWebhookSignature(payload, signature) {
    if (!signature) return false;

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
   */
  generateSignature(payload) {
    const signature = crypto
      .createHmac('sha256', this.#webhookSecret)
      .update(payload)
      .digest('hex');
    return `sha256=${signature}`;
  }

  // Health check - returns company name
  async ping() {
    return this.request('/ping');
  }

  // Get products from LOJEXA
  async getProducts({ page = 1, limit = 100 } = {}) {
    return this.request(`/products?page=${page}&limit=${limit}`);
  }

  // Get stock for a specific SKU
  async getStockBySku(sku) {
    return this.request(`/stock/${encodeURIComponent(sku)}`);
  }

  // Update stock for a product
  async updateStock(sku, quantity) {
    return this.request(`/stock/${encodeURIComponent(sku)}`, {
      method: 'POST',
      body: JSON.stringify({ quantity })
    });
  }

  // Get orders from LOJEXA
  async getOrders({ status, dateFrom, dateTo, limit = 100 } = {}) {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);
    params.append('limit', limit.toString());

    return this.request(`/orders?${params.toString()}`);
  }

  // Report a sale (write:sales capability)
  async reportSale(saleData) {
    return this.request('/sales', {
      method: 'POST',
      body: JSON.stringify(saleData)
    });
  }
}

/**
 * Create authenticated LojeXa client from environment variables
 * Returns null if credentials not configured
 */
export function createLojeXaClient() {
  const apiKey = process.env.LOJEXA_API_KEY;
  const webhookSecret = process.env.LOJEXA_WEBHOOK_SECRET;

  if (!apiKey || !webhookSecret) {
    console.warn('[LojeXa] API key or webhook secret not configured');
    return null;
  }

  return new LojeXaClient(
    apiKey,
    webhookSecret,
    process.env.LOJEXA_BASE_URL || 'https://lojexa.com/api/v1'
  );
}