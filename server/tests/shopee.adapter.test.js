/**
 * Shopee Adapter Tests
 *
 * Testa o adapter do Shopee implementando a interface MarketplaceAdapter.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ShopeeAdapter } from '../adapters/shopee.adapter.js';

describe('Shopee Adapter', () => {
  let shopeeAdapter;

  beforeEach(() => {
    shopeeAdapter = new ShopeeAdapter();
    // Clear env vars for clean test
    delete process.env.SHOPEE_PARTNER_ID;
    delete process.env.SHOPEE_PARTNER_KEY;
    delete process.env.SHOPEE_REDIRECT_URI;
    delete process.env.SHOPEE_WEBHOOK_URL;
    delete process.env.SHOPEE_IS_UAT;
    delete process.env.SHOPEE_VERBOSE;
  });

  afterEach(() => {
    shopeeAdapter = null;
  });

  it('should throw when authorizing without partner credentials', async () => {
    await expect(shopeeAdapter.authorize()).rejects.toThrow('SHOPEE_PARTNER_ID e SHOPEE_PARTNER_KEY não configurados');
  });

  it('should generate Shopee auth URL with partner credentials', async () => {
    process.env.SHOPEE_PARTNER_ID = '123456';
    process.env.SHOPEE_PARTNER_KEY = 'test-partner-key';
    process.env.SHOPEE_REDIRECT_URI = 'http://localhost:3000/callback';

    // Create new instance to pick up env vars
    const adapterWithCreds = new ShopeeAdapter();
    const result = await adapterWithCreds.authorize();

    expect(result.url).toContain('https://partner.shopeemobile.com/api/v1/shop/auth_partner');
    expect(result.url).toContain('id=123456');
    expect(result.url).toContain('token=');
    expect(result.url).toContain('redirect=http%3A%2F%2Flocalhost%3A3000%2Fcallback');
    expect(result.state).toBeTruthy();
    expect(result.state.length).toBe(32); // 16 bytes = 32 hex chars
  });

  it('should have correct interface methods', () => {
    expect(typeof shopeeAdapter.authorize).toBe('function');
    expect(typeof shopeeAdapter.callbackHandler).toBe('function');
    expect(typeof shopeeAdapter.refreshToken).toBe('function');
    expect(typeof shopeeAdapter.listProducts).toBe('function');
    expect(typeof shopeeAdapter.pushProduct).toBe('function');
    expect(typeof shopeeAdapter.listOrders).toBe('function');
    expect(typeof shopeeAdapter.updateStock).toBe('function');
    expect(typeof shopeeAdapter.webhookHandler).toBe('function');
    expect(typeof shopeeAdapter.getStatus).toBe('function');
  });

  it('should return not connected status initially', async () => {
    const status = await shopeeAdapter.getStatus();
    expect(status.connected).toBe(false);
    expect(status.errors).toContain('Não conectado — execute OAuth');
  });

  it('should reject callback without code', async () => {
    await expect(shopeeAdapter.callbackHandler()).rejects.toThrow('Authorization code is required');
  });

  it('should reject refreshToken without token or shopId', async () => {
    await expect(shopeeAdapter.refreshToken()).rejects.toThrow('Refresh token or shop ID not available');
  });

  it('should reject listProducts when not connected', async () => {
    await expect(shopeeAdapter.listProducts()).rejects.toThrow('Not connected. Run OAuth flow first.');
  });

  it('should reject pushProduct when not connected', async () => {
    await expect(shopeeAdapter.pushProduct({ title: 'Test' })).rejects.toThrow('Not connected. Run OAuth flow first.');
  });

  it('should reject listOrders when not connected', async () => {
    await expect(shopeeAdapter.listOrders()).rejects.toThrow('Not connected. Run OAuth flow first.');
  });

  it('should reject updateStock when not connected', async () => {
    await expect(shopeeAdapter.updateStock('123', 10)).rejects.toThrow('Not connected. Run OAuth flow first.');
  });

  it('should validate webhook signature', async () => {
    // Set up credentials for webhook validation
    shopeeAdapter.partnerKey = 'test-partner-key';
    shopeeAdapter.webhookUrl = 'https://example.com/webhook';

    const payload = { code: 'order.create', order_sn: 'TEST123' };
    const signature = 'invalid-signature';

    await expect(shopeeAdapter.webhookHandler(payload, signature)).rejects.toThrow('Invalid webhook signature');
  });
});