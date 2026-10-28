/**
 * MarketplaceAdapter Tests
 *
 * Testa a interface, mock adapter, ML adapter skeleton e marketplace service.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as mockAdapter from '../adapters/marketplace.mock.js';
import { MercadoLivreAdapter } from '../adapters/ml.adapter.js';
import * as marketplaceService from '../services/marketplace.service.js';

describe('Mock Marketplace Adapter', () => {
  beforeEach(() => {
    mockAdapter.resetMock();
  });

  afterEach(() => {
    mockAdapter.resetMock();
  });

  it('should not be connected initially', () => {
    const status = mockAdapter.mockStatus();
    expect(status.connected).toBe(false);
    expect(status.errors).toContain('Not connected');
  });

  it('should generate mock OAuth URL', () => {
    const result = mockAdapter.simulateOAuthFlow({
      clientId: 'test-client',
      redirectUri: 'http://localhost:3000/callback',
    });
    expect(result.url).toContain('https://mock-marketplace.com/oauth/authorize');
    expect(result.url).toContain('client_id=test-client');
    expect(result.url).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fcallback');
    expect(result.state).toBeTruthy();
  });

  it('should handle mock callback and set connected', () => {
    const tokens = mockAdapter.handleMockCallback('auth-code-123', 'state-xyz');
    expect(tokens.accessToken).toBeTruthy();
    expect(tokens.expiresIn).toBe(3600);

    const status = mockAdapter.mockStatus();
    expect(status.connected).toBe(true);
    expect(status.errors).toHaveLength(0);
  });

  it('should reject callback without code', () => {
    expect(() => mockAdapter.handleMockCallback()).toThrow('Authorization code is required');
  });

  it('should list 10 mock products', () => {
    const result = mockAdapter.listMockProducts();
    expect(result.items).toHaveLength(10);
    expect(result.total).toBe(10);
    expect(result.page).toBe(1);
  });

  it('should paginate mock products', () => {
    const result = mockAdapter.listMockProducts({ page: 2, limit: 3 });
    expect(result.items).toHaveLength(3);
    expect(result.page).toBe(2);
  });

  it('should push a mock product', () => {
    const product = { title: 'Test Product', price: 99.90 };
    const result = mockAdapter.pushMockProduct(product);
    expect(result.remoteId).toBeTruthy();
    expect(result.status).toBe('published');
  });

  it('should list mock orders', () => {
    const result = mockAdapter.listMockOrders();
    expect(result.orders).toHaveLength(5);
    expect(result.total).toBe(5);
  });

  it('should filter orders by status', () => {
    const result = mockAdapter.listMockOrders({ status: 'paid' });
    expect(result.orders.every(o => o.status === 'paid')).toBe(true);
  });

  it('should update mock stock', () => {
    const result = mockAdapter.updateMockStock('1', -5);
    expect(result.success).toBe(true);
    expect(result.newStock).toBe(95);
  });

  it('should throw when updating non-existent product stock', () => {
    expect(() => mockAdapter.updateMockStock('999', 10)).toThrow('Product 999 not found');
  });

  it('should handle mock webhook', () => {
    const payload = { type: 'order.created', orderId: '123' };
    const result = mockAdapter.handleMockWebhook(payload);
    expect(result.event).toBe('order.created');
    expect(result.data.orderId).toBe('123');
  });

  it('should refresh token', async () => {
    const result = await mockAdapter.refreshToken({ refreshToken: 'old-refresh' });
    expect(result.accessToken).toBeTruthy();
    expect(result.expiresIn).toBe(3600);
  });

  it('should allow direct connect/disconnect', () => {
    mockAdapter.setConnected(true);
    expect(mockAdapter.mockStatus().connected).toBe(true);

    mockAdapter.resetMock();
    expect(mockAdapter.mockStatus().connected).toBe(false);
  });
});

describe('Mercado Livre Adapter (skeleton)', () => {
  let mlAdapter;

  beforeEach(() => {
    mlAdapter = new MercadoLivreAdapter();
  });

  afterEach(() => {
    delete process.env.ML_CLIENT_ID;
    delete process.env.ML_CLIENT_SECRET;
  });

  it('should throw when authorizing without client ID', async () => {
    await expect(mlAdapter.authorize()).rejects.toThrow('ML_CLIENT_ID não configurado');
  });

  it('should generate ML auth URL with client ID', async () => {
    // ML adapter reads env at class initialization, so create new instance
    process.env.ML_CLIENT_ID = 'test-ml-client-id';
    process.env.ML_CLIENT_SECRET = 'test-secret';
    const adapterWithCreds = new MercadoLivreAdapter();
    const result = await adapterWithCreds.authorize();
    expect(result.url).toContain('https://auth.mercadolibre.com/authorization');
    expect(result.url).toContain('client_id=test-ml-client-id');
    expect(result.state).toBeTruthy();
  });

  it('should have stub methods that return placeholders', async () => {
    const status = await mlAdapter.getStatus();
    expect(status.connected).toBe(false);
    expect(status.errors).toContain('Não conectado');
  });

  it('should return placeholder on listProducts', async () => {
    const result = await mlAdapter.listProducts();
    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('should return placeholder on pushProduct', async () => {
    const result = await mlAdapter.pushProduct({ title: 'Test' });
    expect(result.remoteId).toBeTruthy();
    expect(result.status).toBe('pending');
  });

  it('should return placeholder on updateStock', async () => {
    const result = await mlAdapter.updateStock('ML123', 10);
    expect(result.success).toBe(true);
  });
});

describe('Marketplace Service', () => {
  beforeEach(async () => {
    await marketplaceService.registerBuiltins();
  });

  afterEach(async () => {
    // Clear registered adapters
    marketplaceService['adapters'] = new Map();
  });

  it('should list registered adapters', async () => {
    await marketplaceService.registerBuiltins();
    const adapters = await marketplaceService.listAdapters();
    expect(adapters.length).toBeGreaterThan(0);
    const names = adapters.map(a => a.name);
    expect(names).toContain('mock');
  });

  it('should get mock adapter by name', () => {
    const adapter = marketplaceService.getAdapter('mock');
    expect(adapter).toBeDefined();
    expect(typeof adapter.authorize).toBe('function');
  });

  it('should return null for unregistered adapter', () => {
    const adapter = marketplaceService.getAdapter('nonexistent');
    expect(adapter).toBeNull();
  });

  it('should connect to mock adapter', async () => {
    await marketplaceService.registerBuiltins();
    const result = await marketplaceService.connect('mock', {
      clientId: 'test',
      redirectUri: 'http://localhost/callback',
    });
    expect(result.url).toBeTruthy();
  });

  it('should throw when connecting to unregistered adapter', async () => {
    await expect(marketplaceService.connect('unknown')).rejects.toThrow('not found');
  });

  it('should handle mock callback through service', async () => {
    await marketplaceService.registerBuiltins();
    await marketplaceService.connect('mock', { clientId: 'test' });
    const tokens = await marketplaceService.handleCallback('mock', 'code-123', 'state-xyz');
    expect(tokens.accessToken).toBeTruthy();
  });

  it('should disconnect mock adapter', async () => {
    await marketplaceService.registerBuiltins();
    await marketplaceService.connect('mock', { clientId: 'test' });
    const result = await marketplaceService.disconnect('mock');
    expect(result.success).toBe(true);
  });

  it('should throw syncProducts for disconnected adapter', async () => {
    await marketplaceService.registerBuiltins();
    await expect(marketplaceService.syncProducts('mock')).rejects.toThrow('not connected');
  });
});
