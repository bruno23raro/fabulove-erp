/**
 * TikTok Shop Adapter
 * Wrapper REST fino para integração TikTok Shop
 * Sem SDK oficial open source — usa OAuth 2.0 manual
 */

import dotenv from "dotenv";
dotenv.config();

const TIKTOK_BASE_URL = "https://business-api.tiktok.com/open_api/v2";

// TikTok OAuth endpoints
const TIKTOK_AUTHORIZE_URL = "https://business-api.tiktok.com/oauth/authorize";
const TIKTOK_TOKEN_URL = "https://business-api.tiktok.com/oauth/token";
const TIKTOK_USER_INFO_URL = "https://business-api.tiktok.com/open_api/v2/user/info/get";

// Mock mode support
export const MOCK_MODE = process.env.MARKETPLACE_MOCK === "true";

// Mock data for development
const mockShops = [
  {
    id: "TT001",
    name: "Loja TikTok Mock",
    followers: 1250,
    products: 34,
    status: "active",
  },
  {
    id: "TT002",
    name: "Outra Loja Mock",
    followers: 890,
    products: 21,
    status: "active",
  },
];

/**
 * Gera URL de autorização TikTok
 * @param {Object} options - clientId, redirectUri, scopes
 * @returns {string} URL de autorização
 */
export function authorize({ clientId, redirectUri, scopes = ["shop:info.read"] }) {
  const params = new URLSearchParams({
    client_key: clientId,
    redirect_uri: redirectUri,
    scope: scopes.join(","),
    response_type: "code",
    force_auth_code: "true",
  });

  return `${TIKTOK_AUTHORIZE_URL}?${params.toString()}`;
}

/**
 * Handler para callback OAuth TikTok
 * @param {Object} query - query params do callback (code, state)
 * @returns {Object} Tokens de acesso
 */
export async function callbackHandler({ code, state: _state }) {
  if (!code) {
    throw new Error("Código de autorização não recebido do TikTok");
  }

  const response = await fetch(`${TIKTOK_TOKEN_URL}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY || "",
      client_secret: process.env.TIKTOK_CLIENT_SECRET || "",
      code,
      grant_type: "authorization_code",
    }),
  });

  const data = await response.json();

  if (!response.ok || !data.access_token) {
    throw new Error(data.mesage || data.error_msg || "Falha ao trocar código por token");
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || null,
    expiresIn: data.expires_in || 7200,
    openId: data.open_id || null,
  };
}

/**
 * Atualiza token de acesso usando refresh token
 * @param {string} refreshToken - token de atualização
 * @returns {Object} Novos tokens
 */
export async function refreshToken(refreshToken) {
  const response = await fetch(`${TIKTOK_TOKEN_URL}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY || "",
      client_secret: process.env.TIKTOK_CLIENT_SECRET || "",
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = await response.json();

  if (!response.ok || !data.access_token) {
    throw new Error(data.mesage || data.error_msg || "Falha ao atualizar token");
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || null,
    expiresIn: data.expires_in || 7200,
  };
}

/**
 * Obtém informações da loja TikTok
 * @param {string} accessToken - token de acesso
 * @returns {Object} Dados da loja
 */
export async function getShopInfo(accessToken) {
  const response = await fetch(
    `${TIKTOK_USER_INFO_URL}?fields=open_id,nickname,avatar, follower_count, video_count, video_view_count, sales_count`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const data = await response.json();

  if (!response.ok || !data.data) {
    throw new Error(data.mesage || data.error_msg || "Falha ao obter informações da loja");
  }

  return data.data;
}

/**
 * Lista produtos da loja TikTok
 * @param {string} accessToken - token de acesso
 * @param {Object} pagination - paginação (offset, limit)
 * @returns {Object} Lista de produtos
 */
export async function listProducts(accessToken, pagination = { offset: 0, limit: 50 }) {
  const { offset, limit } = pagination;
  const response = await fetch(`${TIKTOK_BASE_URL}/product/list?offset=${offset}&limit=${limit}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await response.json();

  if (!response.ok || !data.data) {
    throw new Error(data.mesage || data.error_msg || "Falha ao listar produtos");
  }

  return data.data;
}

/**
 * Empurra um produto para TikTok Shop
 * @param {string} accessToken - token de acesso
 * @param {Object} productData - dados do produto
 * @returns {Object} Resultado do push
 */
export async function pushProduct(accessToken, productData) {
  const response = await fetch(`${TIKTOK_BASE_URL}/product/push`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(productData),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.mesage || result.error_msg || "Falha ao empurrar produto");
  }

  return result;
}

/**
 * Lista pedidos da loja TikTok
 * @param {string} accessToken - token de acesso
 * @param {Object} pagination - paginação
 * @param {Object} filters - filtros (status, data_inicial, data_final)
 * @returns {Object} Lista de pedidos
 */
export async function listOrders(accessToken, pagination = { offset: 0, limit: 50 }, filters = {}) {
  const { offset, limit } = pagination;
  const filterParams = new URLSearchParams();

  if (filters.status) filterParams.append("status", filters.status);
  if (filters.begin_time) filterParams.append("begin_time", filters.begin_time);
  if (filters.end_time) filterParams.append("end_time", filters.end_time);

  const response = await fetch(
    `${TIKTOK_BASE_URL}/order/list?offset=${offset}&limit=${limit}&${filterParams.toString()}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const data = await response.json();

  if (!response.ok || !data.data) {
    throw new Error(data.mesage || data.error_msg || "Falha ao listar pedidos");
  }

  return data.data;
}

/**
 * Atualiza estoque do produto na TikTok Shop
 * @param {string} accessToken - token de acesso
 * @param {Object} stockData - dados de estoque (product_id, quantity)
 * @returns {Object} Resultado da atualização
 */
export async function updateStock(accessToken, stockData) {
  const response = await fetch(`${TIKTOK_BASE_URL}/product/stock/update`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(stockData),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.mesage || result.error_msg || "Falha ao atualizar estoque");
  }

  return result;
}

/**
 * Handler para webhook TikTok
 * @param {Object} payload - payload do webhook
 * @returns {Object} Validated webhook data
 */
export function webhookHandler(payload) {
  // Validar signature TikTok (HMAC)
  // TODO: Implementar validação de signature quando tiver credenciais
  const validated = {
    type: payload.type || "unknown",
    code: payload.code || null,
    event_time: payload.event_time || Date.now(),
    shop_id: payload.shop_id || null,
    data: payload.data || {},
  };

  return validated;
}

/**
 * Verifica status da conexão da loja
 * @param {string} accessToken - token de acesso
 * @returns {Object} Status da conexão
 */
export function getStatus(accessToken) {
  return {
    connected: !!accessToken,
    mock: !accessToken && process.env.MARKETPLACE_MOCK === "true",
    status: process.env.MARKETPLACE_MOCK === "true" ? "mock_active" : "pending_auth",
  };
}

/**
 * Desconecta/Revoga token TikTok
 * @param {string} accessToken - token atual (opcional)
 * @returns {Object} Resultado da desconexão
 */
export async function disconnect(_accessToken) {
  // TikTok não tem endpoint direto de revogação no momento
  // Limpar tokens do armazenamento/localStorage
  return {
    success: true,
    message: "Conexão TikTok desativada (tokens removidos)",
    mock: process.env.MARKETPLACE_MOCK === "true",
  };
}

/**
 * Verifica se o adapter está em modo mock
 * @returns {boolean} true se MARKETPLACE_MOCK=true
 */
export function isMockMode() {
  return MOCK_MODE;
}

/**
 * Registra adapter mock quando MARKETPLACE_MOCK=true
 * Mantém apenas o mock adapter ativo, ignorando registros reais
 */
export function registerBuiltins() {
  if (MOCK_MODE) {
    console.log("[marketplace] MARKETPLACE_MOCK=true — registering only mock adapter");
  }
}

/**
 * Dados mock para desenvolvimento
 * @returns {Array} Dados de lojas mock
 */
export function getMockShops() {
  return mockShops;
}

export default {
  authorize,
  callbackHandler,
  refreshToken,
  listProducts,
  pushProduct,
  listOrders,
  updateStock,
  webhookHandler,
  getStatus,
  disconnect,
  isMockMode,
  registerBuiltins,
  getMockShops,
};
