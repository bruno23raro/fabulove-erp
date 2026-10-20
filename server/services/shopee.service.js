/**
 * Shopee Service — integração oficial com marketplace
 *
 * Modos de autenticação:
 *   1. OAuth Partner (recomendado): Partner ID + Partner Key → URL de autorização → callback → tokens
 *   2. API Key direto (fallback): API Key + API Secret com assinatura HMAC-SHA256
 *
 * O fluxo OAuth segue a documentação oficial:
 *   https://open.shopee.com/developer-guide/736
 */

import crypto from 'node:crypto';
import pool from '../config/database.js';
import dotenv from 'dotenv';
dotenv.config();

const PARTNER_BASE_URL = 'https://partner.shopeemobile.com';
const SHOP_API_BASE = 'https://partner.shopeemobile.com';
const API_VERSION = 'api';

// URLs de callback — devem ser configuradas no console da Shopee (open.shopee.com)
// Em desenvolvimento local, o usuário informa a URL manualmente na interface
const DEFAULT_CALLBACK_URL = process.env.SHOPEE_CALLBACK_URL || 'http://localhost:3000/api/marketplaces/shopee/oauth/callback';
const DEFAULT_PARTNER_ID = process.env.SHOPEE_PARTNER_ID || '';
const DEFAULT_PARTNER_KEY = process.env.SHOPEE_PARTNER_KEY || '';

// ── Helpers internos ──────────────────────────────────────────────────────────

async function getConfig() {
  const { rows } = await pool.query(
    'SELECT * FROM shopee_config ORDER BY id DESC LIMIT 1'
  );
  return rows[0] || null;
}

async function setConfig(fields) {
  const existing = await getConfig();
  if (existing) {
    await pool.query(
      `UPDATE shopee_config SET ${Object.entries(fields)
        .map(([k, v], i) => `${k} = $${i + 1}`)
        .join(', ')} WHERE id = $${Object.keys(fields).length + 1}`,
      [...Object.values(fields), existing.id]
    );
  } else {
    const cols = Object.keys(fields).join(', ');
    const placeholders = Object.keys(fields).map((_, i) => `$${i + 1}`).join(', ');
    await pool.query(
      `INSERT INTO shopee_config (${cols}) VALUES (${placeholders})`,
      Object.values(fields)
    );
  }
}

async function logAction(action, productId, shopeeItemId, status, message) {
  await pool.query(
    `INSERT INTO shopee_sync_logs (action, product_id, shopee_item_id, status, message)
     VALUES ($1, $2, $3, $4, $5)`,
    [action, productId ?? null, shopeeItemId ?? null, status, message ?? null]
  );
}

function isTokenValid(config) {
  if (!config || !config.access_token) return false;
  if (!config.token_expires_at) return true;
  return new Date(config.token_expires_at) > new Date(Date.now() - 60_000); // margem de 1 min
}

function generateState() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Assinatura HMAC-SHA256 para URLs e requests da API Shopee
 *
 * @param {string} method  GET / POST / PUT / PATCH / DELETE
 * @param {string} path    Path da API (ex: '/mapi/vapi/item/get')
 * @param {string} timestamp Timestamp Unix em segundos
 * @param {string} apiKey  Partner ID
 * @param {string} apiSecret Partner Key (secret)
 * @param {string} body    Body JSON stringificado (vazio se GET)
 * @returns {string} Base64 signature
 */
function signUrl(path, timestamp, apiKey, apiSecret) {
  // Para URL de autorização: HMAC do path + timestamp + apiKey + apiSecret
  const message = `${path}${timestamp}${apiKey}${apiSecret}`;
  return crypto.createHmac('sha256', apiSecret).update(message).digest('base64');
}

function signRequest(method, path, timestamp, apiKey, apiSecret, body = '') {
  const message = method + path + timestamp + apiKey + body + apiSecret;
  return crypto
    .createHmac('sha256', apiSecret)
    .update(message)
    .digest('base64');
}

// ── Serviço principal ────────────────────────────────────────────────────────

export const ShopeeService = {
  /**
   * Gerar URL de autorização OAuth.
   *
   * Redireciona o usuário para a Shopee para consentir a integração.
   * O estado (state) é gerado aleatoriamente e armazenado em sessão/temporariamente
   * para proteção CSRF no callback.
   *
   * @param {object} opts
   * @param {string} opts.partnerId   Partner ID (obrigatório se não houver no env)
   * @param {string} opts.partnerKey  Partner Key (obrigatório se não houver no env)
   * @param {string} opts.shopId      Shop ID (opcional — redireciona direto para a loja)
   * @param {string} opts.callbackUrl URL de callback (padrão: SHOPEE_CALLBACK_URL do env)
   * @param {string} opts.locale      Locale (padrão: 'pt_BR')
   * @returns {string} URL completa para redirecionamento
   * @throws {Error} Se partnerId ou partnerKey não forem fornecidos
   */
  async getAuthUrl({ partnerId, partnerKey, shopId, callbackUrl, locale = 'pt_BR' } = {}) {
    const pid = partnerId || DEFAULT_PARTNER_ID;
    const pkey = partnerKey || DEFAULT_PARTNER_KEY;
    const cb = callbackUrl || DEFAULT_CALLBACK_URL;

    if (!pid || !pkey) {
      throw new Error(
        'Partner ID e Partner Key não configurados. ' +
        'Configure-os no painel Ajustes da Loja ou nas variáveis de ambiente SHOPEE_PARTNER_ID / SHOPEE_PARTNER_KEY. ' +
        'Obtenha as credenciais em https://open.shopee.com/console/app'
      );
    }

    const state = generateState();
    const timestamp = Math.floor(Date.now() / 1000).toString();

    // Caminho: /oauth/authorization
    const authPath = '/oauth/authorization';
    const signature = signUrl(authPath, timestamp, pid, pkey);

    const params = new URLSearchParams({
      partner_id: pid,
      shop_id: shopId || '',
      locale,
      redirect_uri: cb,
      state,
      timestamp,
      signature,
    });

    const url = `${PARTNER_BASE_URL}?${params.toString()}`;

    // Armazena o state temporariamente na config (sobrescreve anterior)
    await setConfig({ auth_state: state });

    return url;
  },

  /**
   * Processar callback OAuth após autorização do usuário.
   *
   * Recebe o authorization_code e state da Shopee, troca por tokens,
   * armazena no banco e marca a loja como conectada.
   *
   * @param {string} code Authorization code recebido da Shopee
   * @param {string} state State enviado na requisição de autorização (validação CSRF)
   * @param {string} partnerKey Partner Key para assinar a troca de token
   * @returns {object} Resultado da conexão com shopId, token, etc.
   */
  async handleCallback(code, state, partnerKey) {
    const config = await getConfig();

    // Valida CSRF: state deve bater com o armazenado
    if (!state || state !== (config?.auth_state || '')) {
      throw new Error('Estado de segurança (state) inválido. Tente novamente.');
    }

    const pid = config?.partner_id || DEFAULT_PARTNER_ID;
    const pkey = partnerKey || config?.api_secret || DEFAULT_PARTNER_KEY;

    if (!pid || !pkey) {
      throw new Error('Partner ID ou Partner Key ausentes. Configure no painel da loja.');
    }

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const body = JSON.stringify({
      partner_id: pid,
      partner_key: pkey,
      authorization_code: code,
      grant_type: 'authorization_code',
    });

    const exchangePath = '/oauth/token';
    const signature = signRequest('POST', exchangePath, timestamp, pid, pkey, body);

    let res;
    try {
      res = await fetch(`${PARTNER_BASE_URL}${exchangePath}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Signature': signature,
          'X-Timestamp': timestamp,
          'X-Source': 'Partner',
          'User-Agent': 'FabuloveERP/1.0',
        },
        body,
      });
    } catch (err) {
      throw new Error(`Falha na comunicação com a Shopee ao trocar o código por token: ${err.message}`);
    }

    let data;
    try {
      data = await res.json();
    } catch {
      throw new Error(`Resposta inválida da Shopee ao trocar token: ${await res.text()}`);
    }

    if (data.error || data.status === 1) {
      const msg = data.message || 'Erro desconhecido';
      // Mensagens claras para erros comuns
      if (msg.toLowerCase().includes('code') || msg.toLowerCase().includes('expired')) {
        throw new Error('Código de autorização expirado ou inválido. Solicite nova conexão.');
      }
      if (msg.toLowerCase().includes('signature') || msg.toLowerCase().includes('invalid')) {
        throw new Error('Parcer key inválida. Verifique as credenciais no painel da Shopee.');
      }
      throw new Error(`Erro na autorização Shopee: ${msg}`);
    }

    const tokenData = data.data || data;
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token || null;
    const expiresIn = tokenData.expires_in || 86400; // padrão 24h
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // Armazena tudo na config
    await setConfig({
      api_key: pid,           // partner_id funciona como "api_key"
      api_secret: pkey,       // partner_key funciona como "api_secret"
      access_token: accessToken,
      refresh_token: refreshToken,
      token_expires_at: tokenExpiresAt,
      token_type: tokenData.token_type || 'Bearer',
      partner_id: pid,
      auth_state: null,       // limpa o state usado
      sync_enabled: true,
    });

    await logAction('auth_oauth_callback', null, null, 'ok', `OAuth autorizado com sucesso`);

    return {
      shopId: tokenData.shop_id || null,
      token: accessToken,
      expiresAt: tokenExpiresAt,
      syncEnabled: true,
    };
  },

  /**
   * Renovar token de acesso usando refresh_token.
   *
   * @returns {object} Novo token e data de expiração
   */
  async refreshToken() {
    const config = await getConfig();
    if (!config?.refresh_token) {
      throw new Error('Nenhum refresh_token disponível. Reconecte sua conta Shopee.');
    }

    const pid = config.partner_id || DEFAULT_PARTNER_ID;
    const pkey = config.api_secret || DEFAULT_PARTNER_KEY;

    if (!pid || !pkey) {
      throw new Error('Partner ID ou Partner Key ausentes. Reconecte sua conta.');
    }

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const body = JSON.stringify({
      partner_id: pid,
      partner_key: pkey,
      grant_type: 'refresh_token',
      refresh_token: config.refresh_token,
    });

    const exchangePath = '/oauth/token';
    const signature = signRequest('POST', exchangePath, timestamp, pid, pkey, body);

    let res;
    try {
      res = await fetch(`${PARTNER_BASE_URL}${exchangePath}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Signature': signature,
          'X-Timestamp': timestamp,
          'X-Source': 'Partner',
          'User-Agent': 'FabuloveERP/1.0',
        },
        body,
      });
    } catch (err) {
      throw new Error(`Falha ao renovar token: ${err.message}`);
    }

    let data;
    try { data = await res.json(); } catch {
      throw new Error(`Resposta inválida ao renovar token`);
    }

    if (data.error || data.status === 1) {
      // Refresh token também expirou — precisa reconectar via OAuth
      await setConfig({ access_token: null, refresh_token: null, token_expires_at: null, auth_state: null });
      throw new Error('Token de refresh expirado. É necessário reconectar via OAuth.');
    }

    const tokenData = data.data || data;
    const tokenExpiresAt = new Date(Date.now() + (tokenData.expires_in || 86400) * 1000).toISOString();

    await setConfig({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || config.refresh_token,
      token_expires_at: tokenExpiresAt,
    });

    await logAction('auth_token_refresh', null, null, 'ok', 'Token renovado com sucesso');
    return { token: tokenData.access_token, expiresAt: tokenExpiresAt };
  },

  /**
   * Fazer chamada HTTP para a API Shopee.
   * Prioriza Bearer token (OAuth); fallback para HMAC (API Key direta).
   *
   * @param {string} method  HTTP method
   * @param {string} path    API path
   * @param {object|null} body Request body (GET = null)
   * @returns {object} Resposta da API Shopee
   */
  async shopeeRequest(method, path, body = null) {
    let config = await getConfig();

    // Renova token se expirado e houver refresh_token
    if (!isTokenValid(config) && config?.refresh_token) {
      try {
        await this.refreshToken();
        config = await getConfig();
      } catch (err) {
        throw new Error(`Falha na renovação do token: ${err.message}`);
      }
    }

    if (!config) throw new Error('Shopee não configurado. Conecte sua conta na aba Marketplace.');

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const bodyStr = body ? JSON.stringify(body) : '';
    const apiPath = path.startsWith('/') ? path : `/${path}`;

    let headers;

    if (config.access_token) {
      // Modo OAuth Bearer
      headers = {
        'Content-Type': 'application/json; charset=UTF-8',
        'Authorization': `Bearer ${config.access_token}`,
        'X-Timestamp': timestamp,
        'X-Source': 'Partner',
      };
    } else if (config.api_key && config.api_secret) {
      // Modo HMAC direto (API Key)
      const signature = signRequest(method, apiPath, timestamp, config.api_key, config.api_secret, bodyStr);
      headers = {
        'Content-Type': 'application/json; charset=UTF-8',
        'Authorization': `HmacSHA256 ${config.api_key}`,
        'X-Signature': signature,
        'X-Timestamp': timestamp,
        'X-Source': 'Partner',
      };
    } else {
      throw new Error('Shopee não configurado. Conecte sua conta na aba Marketplace.');
    }

    if (config.shop_id) headers['X-ShopeeShop-Id'] = config.shop_id;

    try {
      const res = await fetch(`${SHOP_API_BASE}/${API_VERSION}${apiPath}`, {
        method,
        headers,
        body: bodyStr || undefined,
      });

      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch {
        throw new Error(`Shopee API retornou resposta não-JSON: ${text.slice(0, 200)}`);
      }

      // Token expirado? Tenta renovar e retry
      if ((data.error || (data.status === 1)) && data.message) {
        const msg = (data.message || '').toLowerCase();
        if (msg.includes('token') || msg.includes('expired') || msg.includes('unauthorized')) {
          if (config.refresh_token) {
            try {
              await this.refreshToken();
              config = await getConfig();
              const retryHeaders = {
                'Content-Type': 'application/json; charset=UTF-8',
                'Authorization': `Bearer ${config.access_token}`,
                'X-Timestamp': timestamp,
                'X-Source': 'Partner',
                ...(config.shop_id ? { 'X-ShopeeShop-Id': config.shop_id } : {}),
              };
              const retryRes = await fetch(`${SHOP_API_BASE}/${API_VERSION}${apiPath}`, {
                method, headers: retryHeaders, body: bodyStr || undefined,
              });
              const retryText = await retryRes.text();
              try { data = JSON.parse(retryText); } catch {
                throw new Error(`Shopee API error (retry): ${retryText.slice(0, 200)}`);
              }
            } catch (_) { /* ignora falha no retry */ }
          }
        }
      }

      if (data.error || data.status === 1) {
        throw new Error(`Shopee API error: ${data.message ?? JSON.stringify(data)}`);
      }
      return data;
    } catch (err) {
      // Erros de rede já são propagados
      throw err;
    }
  },

  /**
   * Desconectar conta Shopee — limpa tokens e credenciais.
   */
  async disconnect() {
    await setConfig({
      access_token: null,
      refresh_token: null,
      token_expires_at: null,
      auth_state: null,
      sync_enabled: false,
    });
    await logAction('auth_disconnect', null, null, 'ok', 'Conta desconectada');
  },

  /**
   * Salvar credenciais de API Key/Secret (modo parceiro direto, sem OAuth)
   */
  async saveConfig({ apiKey, apiSecret, shopId, partnerId, syncEnabled }) {
    await setConfig({
      api_key: apiKey.trim(),
      api_secret: apiSecret.trim(),
      shop_id: shopId ? shopId.trim() : null,
      partner_id: partnerId ? partnerId.trim() : null,
      sync_enabled: !!syncEnabled,
    });
    await logAction('config_save', null, null, 'ok', 'Credenciais salvas');
  },

  /**
   * Retornar status atual da integração
   */
  async getStatus() {
    const config = await getConfig();
    if (!config) {
      return {
        configured: false,
        hasToken: false,
        syncEnabled: false,
        shopId: null,
        partnerId: null,
        tokenExpiresAt: null,
        lastSyncAt: null,
        lastSyncStatus: null,
        authMethod: null,
      };
    }
    return {
      configured: true,
      hasToken: isTokenValid(config),
      syncEnabled: config.sync_enabled,
      shopId: config.shop_id || null,
      partnerId: config.partner_id || null,
      // Mostra apenas os 3 primeiros chars do partner_id para identificação
      partnerIdShort: config.partner_id ? `${config.partner_id.slice(0, 3)}...` : null,
      tokenExpiresAt: config.token_expires_at || null,
      lastSyncAt: config.last_sync_at || null,
      lastSyncStatus: config.last_sync_status || null,
      // Indica o método de autenticação atual
      authMethod: config.access_token ? 'oauth' : (config.api_key ? 'api_key' : null),
    };
  },

  /**
   * Listar produtos paginados da loja Shopee (via API item/get)
   */
  async listProducts(fromIndex = 0, limit = 50) {
    const data = await this.shopeeRequest('GET', `/mapi/v${API_VERSION}/item/get?from=${fromIndex}&limit=${limit}`);
    const items = data.items || [];
    return items.map((item) => ({
      item_id: item.item_id,
      name: item.name,
      description: item.description || '',
      price: item.price,
      stock: item.stock,
      sku: item.models?.[0]?.sku || '',
      barcode: item.models?.[0]?.barcode || '',
      category_path: item.category_path || '',
      image_urls: item.images?.map((img) => img.image) || [],
      variations: (item.models || []).map((m) => ({
        name: m.name,
        price: m.price,
        stock: m.stock,
        sku: m.sku,
        barcode: m.barcode,
        attributes: m.attributes || [],
      })),
      brand: item.brand || '',
      is_active: item.status === 1,
    }));
  },

  /**
   * Sincronizar todos os produtos Shopee para o ERP (paginação automática)
   */
  async syncProductsFromShopee() {
    const config = await getConfig();
    if (!config) throw new Error('Shopee não configurado. Conecte sua conta primeiro.');

    let totalCreated = 0;
    let totalUpdated = 0;
    let totalErrors = 0;
    let fromIndex = 0;
    const pageSize = 50;
    const ProductModel = (await import('../models/product.model.js')).ProductModel;

    while (true) {
      let items;
      try {
        items = await this.listProducts(fromIndex, pageSize);
      } catch (err) {
        await setConfig({ last_sync_status: 'error', last_sync_at: new Date().toISOString() });
        await logAction('sync_products', null, null, 'error', err.message);
        throw err;
      }

      if (!items.length) break;

      for (const item of items) {
        try {
          let product = item.sku
            ? await ProductModel.findBySku(item.sku)
            : null;

          if (!product && item.barcode) {
            product = await ProductModel.findByBarcode(item.barcode);
          }

          const price = (item.price / 10000).toFixed(2);
          const priceNum = parseFloat(price) || 0;

          if (product) {
            await ProductModel.update(product.id, {
              name: item.name,
              sku: item.sku,
              barcode: item.barcode,
              description: item.description,
              price: priceNum,
              stock: item.stock,
              categoryId: null,
              imageUrl: item.image_urls?.[0] || null,
              isActive: item.is_active,
            });
            totalUpdated++;
            await logAction('sync_update', product.id, item.item_id, 'ok', `Atualizado: ${item.name}`);
          } else {
            const created = await ProductModel.create({
              name: item.name,
              sku: item.sku,
              barcode: item.barcode,
              description: item.description,
              price: priceNum,
              stock: item.stock,
              categoryId: null,
              imageUrl: item.image_urls?.[0] || null,
              isActive: item.is_active,
            });
            totalCreated++;
            await logAction('sync_create', created.id, item.item_id, 'ok', `Criado: ${item.name}`);
          }
        } catch (err) {
          totalErrors++;
          await logAction('sync_error', null, item.item_id, 'error', `${item.name}: ${err.message}`);
        }
      }

      fromIndex += pageSize;
      if (items.length < pageSize) break;
    }

    await setConfig({
      last_sync_at: new Date().toISOString(),
      last_sync_status: totalErrors > 0 ? 'partial' : 'ok',
    });
    await logAction('sync_complete', null, null, totalErrors > 0 ? 'partial' : 'ok',
      `Sincronização concluída: ${totalCreated} criados, ${totalUpdated} atualizados, ${totalErrors} erros`);

    return { created: totalCreated, updated: totalUpdated, errors: totalErrors };
  },

  /**
   * Sincronizar estoque após venda
   */
  async syncStock(productId, quantitySold) {
    const config = await getConfig();
    if (!config || !config.sync_enabled) return { synced: false, reason: 'sync desabilitado' };

    const ProductModel = (await import('../models/product.model.js')).ProductModel;
    const product = await ProductModel.findById(productId);
    if (!product) {
      await logAction('sync_stock', productId, null, 'error', 'Produto não encontrado');
      return { synced: false, reason: 'produto não encontrado' };
    }

    let shopeeItemId = null;
    let newStock = product.stock;

    if (product.sku) {
      try {
        const items = await this.listProducts(0, 200);
        const found = items.find((i) => i.sku === product.sku);
        if (found) {
          shopeeItemId = found.item_id;
          newStock = Math.max(0, found.stock - quantitySold);
        }
      } catch (_) {
        // Não bloqueia a venda
      }
    }

    if (shopeeItemId) {
      try {
        await this.shopeeRequest('POST', `/mapi/v${API_VERSION}/item/update`, {
          item_id: shopeeItemId,
          stock: newStock,
        });
        await logAction('sync_stock', productId, shopeeItemId, 'ok',
          `Estoque atualizado: ${newStock} (vendida ${quantitySold})`);
        return { synced: true, shopeeItemId, newStock };
      } catch (err) {
        await logAction('sync_stock', productId, shopeeItemId, 'error', err.message);
        return { synced: false, reason: err.message };
      }
    }

    await logAction('sync_stock', productId, null, 'skipped', 'Nenhum item Shopee encontrado por SKU');
    return { synced: false, reason: 'item Shopee não encontrado por SKU' };
  },

  /**
   * Exportar CSV padronizado para importação na Shopee
   */
  async exportCsv() {
    const { rows } = await pool.query(
      `SELECT p.id, p.name, p.sku, p.barcode, p.description, p.price, p.price_shopee,
              p.stock, p.is_active, p.image_url, c.name as category_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.is_active = TRUE
       ORDER BY p.name ASC`
    );

    const HEADER = [
      'image_url', 'video_url', 'brand', 'anvisa_code', 'barcode', 'size',
      'description', 'variation', 'color', 'ncm', 'origin', 'cfop',
      'measurement_unit', 'cest', 'weight_g', 'condition', 'sku', 'gtin',
    ].join(';');

    const escape = (val) => {
      if (val === null || val === undefined) return '';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const lines = [HEADER];
    for (const p of rows) {
      const row = [
        escape(p.image_url),
        escape(''),
        escape(''),
        escape(''),
        escape(p.barcode),
        escape(''),
        escape(p.description),
        escape(''),
        escape(''),
        escape(''),
        escape('Brasil'),
        escape('5101'),
        escape('UN'),
        escape(''),
        escape(String(p.stock || 0)),
        escape('new'),
        escape(p.sku),
        escape(''),
      ];
      lines.push(row.join(';'));
    }

    return '﻿' + lines.join('\r\n');
  },

  /**
   * Listar logs de sincronização
   */
  async listLogs(limit = 50) {
    const { rows } = await pool.query(
      `SELECT sl.id, sl.action, sl.status, sl.message, sl.created_at,
              p.name as product_name, p.sku as product_sku
       FROM shopee_sync_logs sl
       LEFT JOIN products p ON p.id = sl.product_id
       ORDER BY sl.created_at DESC
       LIMIT $1`,
      [limit]
    );
    return rows;
  },
};
