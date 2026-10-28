/**
 * Mock Marketplace Adapter
 *
 * Implementação mock da interface MarketplaceAdapter para testes
 * e desenvolvimento sem necessidade de credenciais reais.
 */

const MOCK_PRODUCTS = [
  { id: '1', remoteId: 'MLB123', title: 'Camiseta Básica', price: 49.90, stock: 100 },
  { id: '2', remoteId: 'MLB124', title: 'Calça Jeans', price: 149.90, stock: 50 },
  { id: '3', remoteId: 'MLB125', title: 'Tênis Esportivo', price: 299.90, stock: 30 },
  { id: '4', remoteId: 'MLB126', title: 'Boné', price: 39.90, stock: 200 },
  { id: '5', remoteId: 'MLB127', title: 'Mochila', price: 199.90, stock: 25 },
  { id: '6', remoteId: 'MLB128', title: 'Relógio', price: 599.90, stock: 10 },
  { id: '7', remoteId: 'MLB129', title: 'Óculos de Sol', price: 129.90, stock: 40 },
  { id: '8', remoteId: 'MLB130', title: 'Bolsa', price: 179.90, stock: 15 },
  { id: '9', remoteId: 'MLB131', title: 'Carteira', price: 89.90, stock: 60 },
  { id: '10', remoteId: 'MLB132', title: 'Cinto', price: 69.90, stock: 80 },
];

const MOCK_ORDERS = [
  { id: 'ORD001', remoteId: 'ML-001', status: 'paid', total: 149.80, createdAt: '2026-10-27T10:00:00Z' },
  { id: 'ORD002', remoteId: 'ML-002', status: 'shipped', total: 299.90, createdAt: '2026-10-26T15:30:00Z' },
  { id: 'ORD003', remoteId: 'ML-003', status: 'pending', total: 49.90, createdAt: '2026-10-28T08:00:00Z' },
  { id: 'ORD004', remoteId: 'ML-004', status: 'delivered', total: 599.90, createdAt: '2026-10-20T12:00:00Z' },
  { id: 'ORD005', remoteId: 'ML-005', status: 'cancelled', total: 39.90, createdAt: '2026-10-19T09:00:00Z' },
];

let connected = false;
let mockTokens = null;
let lastSyncAt = null;

/** Simulate OAuth flow — returns a mock auth URL */
export function simulateOAuthFlow(params = {}) {
  const { clientId, redirectUri, scope } = params;
  const state = Math.random().toString(36).substring(7);
  const encodedRedirect = encodeURIComponent(redirectUri || 'http://localhost:3000/api/marketplaces/callback');
  return {
    url: `https://mock-marketplace.com/oauth/authorize?client_id=${clientId || 'mock-client'}&redirect_uri=${encodedRedirect}&response_type=code&state=${state}&scope=${scope || 'read write'}`,
    state,
  };
}

/** Handle mock callback — returns mock tokens */
export function handleMockCallback(code, _state) {
  if (!code) throw new Error('Authorization code is required');
  mockTokens = {
    accessToken: `mock_access_${Date.now()}`,
    refreshToken: `mock_refresh_${Date.now()}`,
    expiresIn: 3600,
    scope: 'read write',
  };
  connected = true;
  return mockTokens;
}

/** Refresh token */
export async function refreshToken() {
  return {
    accessToken: `refreshed_${Date.now()}`,
    expiresIn: 3600,
  };
}

/** List mock products */
export function listMockProducts({ page = 1, limit = 10 } = {}) {
  const start = (page - 1) * limit;
  const end = start + limit;
  return {
    items: MOCK_PRODUCTS.slice(start, end),
    total: MOCK_PRODUCTS.length,
    page,
    totalPages: Math.ceil(MOCK_PRODUCTS.length / limit),
  };
}

/** Push mock product */
export function pushMockProduct(product) {
  const remoteId = `ML-${Date.now()}`;
  return { remoteId, status: 'published', title: product.title, price: product.price };
}

/** List mock orders */
export function listMockOrders({ status, page: _page = 1 } = {}) {
  let orders = MOCK_ORDERS;
  if (status) {
    orders = orders.filter(o => o.status === status);
  }
  return { orders, total: orders.length };
}

/** Update mock stock */
export function updateMockStock(productId, quantity) {
  const product = MOCK_PRODUCTS.find(p => p.id === productId);
  if (!product) throw new Error(`Product ${productId} not found`);
  product.stock = Math.max(0, product.stock + quantity);
  return { success: true, productId, newStock: product.stock };
}

/** Handle mock webhook */
export function handleMockWebhook(payload) {
  return {
    event: payload?.type || 'order.created',
    data: payload || {},
    timestamp: new Date().toISOString(),
  };
}

/** Get mock status */
export function mockStatus() {
  return {
    connected,
    lastSync: lastSyncAt,
    errors: connected ? [] : ['Not connected'],
    accountName: 'Loja Mock',
  };
}

/** Reset mock state */
export function resetMock() {
  connected = false;
  mockTokens = null;
  lastSyncAt = null;
}

/** Set connected state directly */
export function setConnected(state) {
  connected = state;
  if (state && !mockTokens) {
    mockTokens = handleMockCallback('mock-code', 'mock-state');
  }
}

/** Set last sync time */
export function setLastSync(timestamp) {
  lastSyncAt = timestamp || new Date().toISOString();
}

export default {
  authorize: simulateOAuthFlow,
  refreshToken,
  listProducts: listMockProducts,
  pushProduct: pushMockProduct,
  listOrders: listMockOrders,
  updateStock: updateMockStock,
  webhookHandler: handleMockWebhook,
  getStatus: mockStatus,
  simulateOAuthFlow,
  handleMockCallback,
  resetMock,
  setConnected,
  setLastSync,
};
