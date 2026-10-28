/**
 * Marketplace Service — Orquestração central de adapters
 *
 * Gerencia o ciclo de vida dos adapters de marketplace:
 * - Registro de adapters (mock, ml, shopee, etc.)
 * - Conexão/desconexão via OAuth
 * - Sincronização de produtos, pedidos e estoque
 */

const adapters = new Map();

/**
 * Register a marketplace adapter
 * @param {string} name — nome único do adapter (ex: 'mock', 'ml', 'shopee')
 * @param {object} adapter — instância que implementa MarketplaceAdapter interface
 */
export function registerAdapter(name, adapter) {
  if (!name || typeof name !== 'string') {
    throw new Error('Adapter name is required');
  }
  if (!adapter || typeof adapter.authorize !== 'function') {
    throw new Error('Adapter must implement MarketplaceAdapter interface');
  }
  adapters.set(name, adapter);
  console.log(`[marketplace] Adapter "${name}" registered`);
}

/**
 * Get adapter by name
 * @param {string} name
 * @returns {object|null}
 */
export function getAdapter(name) {
  return adapters.get(name) || null;
}

/**
 * List all registered adapters with their status
 * @returns {Promise<Array<{name: string, connected: boolean, status: object}>>}
 */
export async function listAdapters() {
  const results = [];
  for (const [name, adapter] of adapters.entries()) {
    try {
      const status = await adapter.getStatus();
      results.push({ name, connected: status.connected, status });
    } catch (err) {
      results.push({ name, connected: false, status: { connected: false, errors: [err.message] } });
    }
  }
  return results;
}

/**
 * Connect to a marketplace via OAuth
 * @param {string} name
 * @param {object} params
 * @returns {Promise<{url: string, state: string}>}
 */
export async function connect(name, params = {}) {
  const adapter = getAdapter(name);
  if (!adapter) {
    throw new Error(`Adapter "${name}" not found. Register it first with registerAdapter().`);
  }
  return adapter.authorize(params);
}

/**
 * Handle OAuth callback for a marketplace
 * @param {string} name
 * @param {string} code
 * @param {string} state
 * @returns {Promise<{accessToken: string, expiresIn: number}>}
 */
export async function handleCallback(name, code, state) {
  const adapter = getAdapter(name);
  if (!adapter) {
    throw new Error(`Adapter "${name}" not found`);
  }
  // Mercado Livre uses callbackHandler, others use refreshToken
  if (typeof adapter.callbackHandler === 'function') {
    return adapter.callbackHandler(code, state);
  }
  return adapter.refreshToken({ code, state });
}

/**
 * Disconnect from a marketplace
 * @param {string} name
 * @returns {Promise<{success: boolean}>}
 */
export async function disconnect(name) {
  const adapter = getAdapter(name);
  if (!adapter) throw new Error(`Adapter "${name}" not found`);

  // Clear any stored tokens
  if (adapter.tokens) {
    adapter.tokens = null;
  }

  // Call adapter-specific disconnect if available
  if (typeof adapter.disconnect === 'function') {
    await adapter.disconnect();
  }

  return { success: true };
}

/**
 * Sync products from marketplace to local DB
 * @param {string} name
 * @returns {Promise<{synced: number, errors: number}>}
 */
export async function syncProducts(name) {
  const adapter = getAdapter(name);
  if (!adapter) throw new Error(`Adapter "${name}" not found`);

  // Check connection first
  const status = await adapter.getStatus();
  if (!status.connected) {
    throw new Error(`Adapter "${name}" is not connected`);
  }

  // TODO: Implement actual sync logic (fetch from adapter, upsert to DB)
  console.warn(`[marketplace] syncProducts("${name}") — TODO: implement sync logic`);
  return { synced: 0, errors: 0 };
}

/**
 * Sync stock from marketplace to local DB
 * @param {string} name
 * @returns {Promise<{synced: number, errors: number}>}
 */
export async function syncStock(name) {
  const adapter = getAdapter(name);
  if (!adapter) throw new Error(`Adapter "${name}" not found`);

  const status = await adapter.getStatus();
  if (!status.connected) {
    throw new Error(`Adapter "${name}" is not connected`);
  }

  // TODO: Implement actual stock sync
  console.warn(`[marketplace] syncStock("${name}") — TODO: implement stock sync`);
  return { synced: 0, errors: 0 };
}

/**
 * Push a local product to marketplace
 * @param {string} name
 * @param {object} product
 * @returns {Promise<{remoteId: string, status: string}>}
 */
export async function pushProduct(name, product) {
  const adapter = getAdapter(name);
  if (!adapter) throw new Error(`Adapter "${name}" not found`);

  const status = await adapter.getStatus();
  if (!status.connected) {
    throw new Error(`Adapter "${name}" is not connected`);
  }

  return adapter.pushProduct(product);
}

/**
 * Register all built-in adapters
 */
export async function registerBuiltins() {
  // Register mock adapter for development/testing
  try {
    const { default: mockAdapter } = await import('../adapters/marketplace.mock.js');
    registerAdapter('mock', mockAdapter);
  } catch (err) {
    console.warn('[marketplace] Could not register mock adapter:', err.message);
  }

  // Register Mercado Livre adapter
  try {
    const { MercadoLivreAdapter } = await import('../adapters/ml.adapter.js');
    registerAdapter('ml', new MercadoLivreAdapter());
  } catch (err) {
    console.warn('[marketplace] Could not register ML adapter:', err.message);
  }

  // Register Shopee adapter
  try {
    const { ShopeeAdapter } = await import('../adapters/shopee.adapter.js');
    registerAdapter('shopee', new ShopeeAdapter());
  } catch (err) {
    console.warn('[marketplace] Could not register Shopee adapter:', err.message);
  }
}

export default {
  registerAdapter,
  getAdapter,
  listAdapters,
  connect,
  handleCallback,
  disconnect,
  syncProducts,
  syncStock,
  pushProduct,
  registerBuiltins,
};
