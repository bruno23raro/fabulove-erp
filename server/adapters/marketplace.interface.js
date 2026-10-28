/**
 * MarketplaceAdapter Interface
 *
 * Interface única que todos os adapters de marketplace devem implementar.
 * Permite trocar de plataforma (Mercado Livre, Shopee, etc.) ou agregadora
 * (marketapi.shop, eCartAPI) sem reescrever o core.
 */

/**
 * @typedef {object} MarketplaceAdapter
 * @property {function(object): Promise<{url: string}>} authorize
 * @property {function(object): Promise<{accessToken: string, expiresIn: number, refreshToken?: string}>} refreshToken
 * @property {function(object): Promise<{items: Array, total: number, page: number}>} listProducts
 * @property {function(object): Promise<{remoteId: string, status: string}>} pushProduct
 * @property {function(object): Promise<{orders: Array, total: number}>} listOrders
 * @property {function(string, number): Promise<{success: boolean}>} updateStock
 * @property {function(object, string): Promise<{event: string, data: object}>} webhookHandler
 * @property {function(): Promise<{connected: boolean, lastSync: string|null, errors: Array<string>}>} getStatus
 */

/**
 * Authorize — Gera URL de autorização OAuth ou retorna credenciais para API key
 * @param {object} _params
 * @param {string} [_params.clientId] — Client ID do app
 * @param {string} [_params.redirectUri] — URI de callback
 * @param {string} [_params.scopes] — Escopos solicitados
 * @returns {Promise<{url: string}>}
 */
export async function authorize(_params) {
  throw new Error('Method not implemented');
}

/**
 * RefreshToken — Renova token de acesso expirado
 * @param {object} _params
 * @param {string} _params.refreshToken
 * @returns {Promise<{accessToken: string, expiresIn: number, refreshToken?: string}>}
 */
export async function refreshToken(_params) {
  throw new Error('Method not implemented');
}

/**
 * ListProducts — Busca produtos no marketplace
 * @param {object} _params
 * @param {number} [_params.page]
 * @param {number} [_params.limit]
 * @returns {Promise<{items: Array, total: number, page: number}>}
 */
export async function listProducts(_params) {
  throw new Error('Method not implemented');
}

/**
 * PushProduct — Envia produto para o marketplace
 * @param {object} _product
 * @returns {Promise<{remoteId: string, status: string}>}
 */
export async function pushProduct(_product) {
  throw new Error('Method not implemented');
}

/**
 * ListOrders — Busca pedidos do marketplace
 * @param {object} _params
 * @param {string} [_params.status]
 * @param {number} [_params.page]
 * @returns {Promise<{orders: Array, total: number}>}
 */
export async function listOrders(_params) {
  throw new Error('Method not implemented');
}

/**
 * UpdateStock — Atualiza estoque no marketplace
 * @param {string} _productId
 * @param {number} _quantity
 * @returns {Promise<{success: boolean}>}
 */
export async function updateStock(_productId, _quantity) {
  throw new Error('Method not implemented');
}

/**
 * WebhookHandler — Processa webhook recebido do marketplace
 * @param {object} _payload
 * @param {string} _signature — Assinatura para validação
 * @returns {Promise<{event: string, data: object}>}
 */
export async function webhookHandler(_payload, _signature) {
  throw new Error('Method not implemented');
}

/**
 * GetStatus — Status da conexão com o marketplace
 * @returns {Promise<{connected: boolean, lastSync: string|null, errors: Array<string>}>}
 */
export async function getStatus() {
  throw new Error('Method not implemented');
}

/** Export interface as object for runtime checks */
export const MarketplaceAdapter = {
  authorize,
  refreshToken,
  listProducts,
  pushProduct,
  listOrders,
  updateStock,
  webhookHandler,
  getStatus,
};
