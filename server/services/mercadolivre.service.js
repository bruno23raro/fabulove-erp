/**
 * Mercado Livre Service — Wrapper para adapter existente
 *
 * Este serviço faz wrapper do MercadoLivreAdapter existente,
 * centralizando a integração através do LojeXa Hub.
 */
import { getAdapter } from './marketplace.service.js';

/**
 * Inicializar adapter Mercado Livre
 */
function getMlAdapter() {
  return getAdapter('ml');
}

/**
 * Conectar ao Mercado Livre via OAuth
 * @returns {Promise<{url: string, state: string}>} URL de autorização
 */
export async function connect() {
  const adapter = getMlAdapter();
  if (!adapter) {
    throw new Error('Mercado Livre adapter not registered. Run registerBuiltins() first.');
  }
  return adapter.authorize({});
}

/**
 * Processar callback OAuth do Mercado Livre
 * @param {string} code - Código de autorização
 * @param {string} state - Estado para CSRF protection
 * @returns {Promise<{accessToken: string, expiresIn: number, shopId: number}>}
 */
export async function handleCallback(code, state) {
  const adapter = getMlAdapter();
  if (!adapter) {
    throw new Error('Mercado Livre adapter not registered');
  }
  return adapter.callbackHandler(code, state);
}

/**
 * Sincronizar produtos do Mercado Livre para o ERP
 * @returns {Promise<{synced: number, errors: number}>}
 */
export async function syncProducts() {
  const adapter = getMlAdapter();
  if (!adapter) throw new Error('Mercado Livre adapter not registered');

  const status = await adapter.getStatus();
  if (!status.connected) {
    throw new Error('Mercado Livre not connected. Run OAuth flow first.');
  }

  return adapter.syncProducts();
}

/**
 * Listar produtos do Mercado Livre
 * @param {object} params - Pagination e filtros
 * @returns {Promise<any>}
 */
export async function listProducts(params = {}) {
  const adapter = getMlAdapter();
  if (!adapter) throw new Error('Mercado Livre adapter not registered');

  return adapter.listProducts(params);
}

/**
 * Obter status da conexão Mercado Livre
 * @returns {Promise<{connected: boolean, shopId: number|null, errors: Array<string>}>}
 */
export async function getStatus() {
  const adapter = getMlAdapter();
  if (!adapter) {
    return { connected: false, shopId: null, errors: ['Adapter not registered'] };
  }
  return adapter.getStatus();
}

/**
 * Verificar se Mercado Livre está conectado
 * @returns {boolean}
 */
export function isConnected() {
  const adapter = getMlAdapter();
  if (!adapter) return false;
  const status = adapter.getStatus();
  return status.connected;
}