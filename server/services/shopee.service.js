/**
 * Shopee Service — Wrapper para adapter existente
 *
 * Este serviço faz wrapper do ShopeeAdapter existente,
 * centralizando a integração através do LojeXa Hub.
 */

/**
 * Helper para obter adapter
 */
async function getAdapter(AdapterName) {
  const { getAdapter } = await import('./marketplace.service.js');
  return getAdapter(AdapterName);
}

/**
 * Conectar ao Shopee via OAuth
 * @returns {Promise<{url: string, state: string}>} URL de autorização
 */
export async function connect() {
  const adapter = await getAdapter('shopee');
  if (!adapter) {
    throw new Error('Shopee adapter not registered. Run registerBuiltins() first.');
  }
  return adapter.authorize({});
}

/**
 * Processar callback OAuth do Shopee
 * @param {string} code - Código de autorização
 * @param {string} state - Estado para CSRF protection
 * @returns {Promise<{accessToken: string, expiresIn: number, shopId: number}>}
 */
export async function handleCallback(code, state) {
  const adapter = await getAdapter('shopee');
  if (!adapter) {
    throw new Error('Shopee adapter not registered');
  }
  return adapter.callbackHandler(code, state);
}

/**
 * Sincronizar produtos do Shopee para o ERP
 * @returns {Promise<{synced: number, errors: number}>}
 */
export async function syncProducts() {
  const adapter = await getAdapter('shopee');
  if (!adapter) throw new Error('Shopee adapter not registered');

  const status = await adapter.getStatus();
  if (!status.connected) {
    throw new Error('Shopee not connected. Run OAuth flow first.');
  }

  const result = await adapter.syncProducts();
  return { synced: result.synced || 0, errors: result.errors || 0 };
}

/**
 * Sincronizar estoque do Shopee (via LojeXa)
 * @param {string} productId - ID do produto no ERP
 * @param {number} quantity - Quantidade vendida
 * @returns {Promise<{success: boolean}>}
 */
export async function syncStock(productId, quantity) {
  // Usar LojeXa Hub para sincronização
  const lojexa = await getAdapter('lojexa');
  if (lojexa) {
    return lojexa.updateStock(productId, quantity);
  }

  const adapter = await getAdapter('shopee');
  if (!adapter) throw new Error('Shopee adapter not registered');

  const status = await adapter.getStatus();
  if (!status.connected) {
    throw new Error('Shopee not connected');
  }

  return adapter.updateStock(productId, quantity);
}

/**
 * Listar produtos do Shopee
 * @param {object} params - Pagination e filtros
 * @returns {Promise<any>}
 */
export async function listProducts(params = {}) {
  const adapter = await getAdapter('shopee');
  if (!adapter) throw new Error('Shopee adapter not registered');

  return adapter.listProducts(params);
}

/**
 * Atualizar estoque do produto no Shopee (via LojeXa)
 * @param {string} productId - ID no ERP
 * @param {number} quantity - Nova quantidade
 * @returns {Promise<{success: boolean}>}
 */
export async function updateStock(productId, quantity) {
  // Usar LojeXa Hub para sincronização
  const lojexa = await getAdapter('lojexa');
  if (lojexa) {
    return lojexa.updateStock(productId, quantity);
  }

  const adapter = await getAdapter('shopee');
  if (!adapter) throw new Error('Shopee adapter not registered');

  const status = await adapter.getStatus();
  if (!status.connected) {
    throw new Error('Shopee not connected');
  }

  return adapter.updateStock(productId, quantity);
}

/**
 * Obter status da conexão Shopee
 * @returns {Promise<{connected: boolean, shopId: number|null, errors: Array<string>}>}
 */
export async function getStatus() {
  // Verificar status via LojeXa primeiro
  const lojexa = await getAdapter('lojexa');
  if (lojexa) {
    const status = await lojexa.getStatus();
    return {
      connected: status.connected,
      shopId: status.shopId || null,
      errors: status.errors || []
    };
  }

  const adapter = await getAdapter('shopee');
  if (!adapter) {
    return { connected: false, shopId: null, errors: ['Adapter not registered'] };
  }
  return adapter.getStatus();
}

/**
 * Empurrar produto para Shopee (via LojeXa)
 * @param {object} product - Dados do produto
 * @returns {Promise<{remoteId: string, status: string}>}
 */
export async function pushProduct(product) {
  // Usar LojeXa Hub para push
  const lojexa = await getAdapter('lojexa');
  if (lojexa) {
    return lojexa.pushProduct(product);
  }

  const adapter = await getAdapter('shopee');
  if (!adapter) throw new Error('Shopee adapter not registered');

  return adapter.pushProduct(product);
}

/**
 * Listar pedidos do Shopee (via LojeXa)
 * @param {object} params - Filtros (status, page, limit)
 * @returns {Promise<{orders: Array, total: number}>}
 */
export async function listOrders(params = {}) {
  // Usar LojeXa Hub para listagem de pedidos
  const lojexa = await getAdapter('lojexa');
  if (lojexa) {
    return lojexa.listOrders(params);
  }

  const adapter = await getAdapter('shopee');
  if (!adapter) throw new Error('Shopee adapter not registered');

  return adapter.listOrders(params);
}

/**
 * Verificar se Shopee está conectado
 * @returns {Promise<boolean>}
 */
export async function isConnected() {
  const status = await getStatus();
  return status.connected;
}