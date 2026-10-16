/**
 * Shopee Service — integração com marketplace
 *
 * Suporta dois modos de autenticação:
 *   1. Email + Senha (web login) — modo padrão do usuário final
 *   2. API Key + API Secret (HMAC) — modo parceiro
 *
 * shopeeRequest() prioriza Bearer token; se não houver, usa HMAC.
 * Se o token expirar, tenta renová-lo automaticamente.
 */

import crypto from 'node:crypto';
import pool from '../config/database.js';

const BASE_URL = 'https://partner.shopeemobile.com';
const API_VERSION = 'api';

// ── Helpers internos ─────────────────────────────────────────────────────────

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
        .join(', ')}, updated_at = CURRENT_TIMESTAMP`,
      Object.values(fields)
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
  return new Date(config.token_expires_at) > new Date();
}

function signRequest(method, path, timestamp, apiKey, apiSecret, body = '') {
  const message = method + path + timestamp + apiKey + body + apiSecret;
  return crypto
    .createHmac('sha256', apiSecret)
    .update(message)
    .digest('base64');
}

/**
 * Login Shopee com email + senha (endpoint web do Partner API)
 */
async function loginWithCredentials(email, password) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const body = JSON.stringify({
    email,
    password,
    locale: 'pt_BR',
    device_type: 'desktop',
    platform: 'web',
  });

  try {
    const url = `${BASE_URL}/api/v${API_VERSION}/auth/login`;
    const signature = signRequest('POST', `/api/v${API_VERSION}/auth/login`, timestamp, '', '', body);

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Signature': signature,
        'X-Timestamp': timestamp,
        'X-Source': 'Partner',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      body,
    });

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Resposta não-JSON do login Shopee: ${text.slice(0, 300)}`);
    }

    if (data.error || data.message) {
      const msg = (data.message || '').toLowerCase();
      if (msg.includes('senha') || msg.includes('email') || msg.includes('login')) {
        throw new Error('Email ou senha incorretos. Verifique suas credenciais Shopee.');
      }
      throw new Error(`Erro no login Shopee: ${data.message ?? JSON.stringify(data)}`);
    }

    const token = data.data?.access_token || data.data?.token || data.access_token || data.token;
    const expiresIn = data.data?.expires_in || data.expires_in || 86400;

    if (!token) {
      throw new Error('Login passou mas não recebeu token. Resposta: ' + JSON.stringify(data).slice(0, 300));
    }

    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    await setConfig({
      email,
      password,
      access_token: token,
      token_expires_at: tokenExpiresAt,
      sync_enabled: true,
    });

    await logAction('auth_login', null, null, 'ok', `Login realizado com sucesso para ${email}`);
    return { token, expiresAt: tokenExpiresAt, email };
  } catch (err) {
    if (err.message.includes('não configurado')) throw err;
    // Falhou com HMAC — tenta fallback mobile
    return await loginWithMobileEndpoint(email, password);
  }
}

/**
 * Fallback: endpoint mobile da Shopee
 */
async function loginWithMobileEndpoint(email, password) {
  try {
    const url = `${BASE_URL}/api/v${API_VERSION}/auth/login`;
    const body = JSON.stringify({ account: email, password });

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        'User-Agent': 'ShopeeMobile/2.5.0 (Android; 13)',
      },
      body,
    });

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Resposta não-JSON do login mobile: ${text.slice(0, 300)}`);
    }

    if (data.error || (data.status && data.status !== 0)) {
      throw new Error(`Falha no login mobile: ${data.message ?? JSON.stringify(data).slice(0, 200)}`);
    }

    const token = data.data?.token || data.data?.access_token || data.token;
    if (!token) throw new Error('Token não encontrado na resposta do login mobile.');

    const tokenExpiresAt = new Date(Date.now() + 86400 * 1000).toISOString();
    await setConfig({
      email,
      password,
      access_token: token,
      token_expires_at: tokenExpiresAt,
      sync_enabled: true,
    });
    await logAction('auth_login_mobile', null, null, 'ok', `Login mobile realizado para ${email}`);
    return { token, expiresAt: tokenExpiresAt, email };
  } catch (err) {
    throw new Error('Falha no login email+senha: ' + err.message);
  }
}

/**
 * Fazer chamada HTTP para a API Shopee
 * Prioriza Bearer token (email+senha); fallback para HMAC-SHA256 (API Key)
 */
async function shopeeRequest(method, path, body = null) {
  const config = await getConfig();
  if (!config) throw new Error('Shopee não configurado. Faça login primeiro.');

  // Verifica se precisa renovar token
  if (!isTokenValid(config) && config.email && config.password) {
    try {
      await loginWithCredentials(config.email, config.password);
    } catch (_) {
      // Falha na renovação — continua com config atual
    }
  }

  // Rebusca config após possível renovação
  const currentConfig = await getConfig();
  if (!currentConfig) throw new Error('Shopee não configurado após renovação de token.');

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const bodyStr = body ? JSON.stringify(body) : '';
  const apiPath = path.startsWith('/') ? path : `/${path}`;

  let headers;
  if (currentConfig.access_token) {
    // Modo token (OAuth)
    headers = {
      'Content-Type': 'application/json; charset=UTF-8',
      'Authorization': `Bearer ${currentConfig.access_token}`,
      'X-Timestamp': timestamp,
      'X-Source': 'Partner',
    };
  } else if (currentConfig.api_key && currentConfig.api_secret) {
    // Modo HMAC (API Key)
    const signature = signRequest(method, apiPath, timestamp, currentConfig.api_key, currentConfig.api_secret, bodyStr);
    headers = {
      'Content-Type': 'application/json; charset=UTF-8',
      'Authorization': `HmacSHA256 ${currentConfig.api_key}`,
      'X-Signature': signature,
      'X-Timestamp': timestamp,
      'X-Source': 'Partner',
    };
  } else {
    throw new Error('Shopee não configurado. Faça login com email+senha ou configure API Key.');
  }

  if (currentConfig.shop_id) headers['X-ShopeeShop-Id'] = currentConfig.shop_id;

  const res = await fetch(`${BASE_URL}/${API_VERSION}${apiPath}`, {
    method,
    headers,
    body: bodyStr || undefined,
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Shopee API retornou texto não-JSON: ${text.slice(0, 200)}`);
  }

  // Token expirado? Tenta renovar e retry
  if ((data.error || data.message) && data.message && data.message.toLowerCase().includes('token')) {
    if (currentConfig.email && currentConfig.password) {
      try {
        await loginWithCredentials(currentConfig.email, currentConfig.password);
        const renewed = await getConfig();
        if (renewed?.access_token) {
          const retryRes = await fetch(`${BASE_URL}/${API_VERSION}${apiPath}`, {
            method,
            headers: {
              'Content-Type': 'application/json; charset=UTF-8',
              'Authorization': `Bearer ${renewed.access_token}`,
              'X-Timestamp': timestamp,
              'X-Source': 'Partner',
              ...(renewed.shop_id ? { 'X-ShopeeShop-Id': renewed.shop_id } : {}),
            },
            body: bodyStr || undefined,
          });
          const retryText = await retryRes.text();
          try {
            data = JSON.parse(retryText);
          } catch {
            throw new Error(`Shopee API error (retry): ${retryText.slice(0, 200)}`);
          }
        }
      } catch (_) {
        // Ignora falha no retry
      }
    }
  }

  if (!data || data.error || data.message) {
    throw new Error(`Shopee API error: ${data?.message ?? data?.error ?? JSON.stringify(data)}`);
  }
  return data;
}

// ── Exportados ────────────────────────────────────────────────────────────────

export const ShopeeService = {
  /**
   * Login com email + senha da conta Shopee
   * Retorna { token, expiresAt, shopId, syncEnabled, email }
   */
  async login(email, password) {
    const result = await loginWithCredentials(email, password);
    const config = await getConfig();
    return {
      ...result,
      shopId: config?.shop_id || null,
      syncEnabled: config?.sync_enabled || false,
    };
  },

  /**
   * Salvar credenciais de API Key/Secret (modo parceiro)
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
        syncEnabled: false,
        shopId: null,
        lastSyncAt: null,
        lastSyncStatus: null,
        hasToken: false,
      };
    }
    return {
      configured: true,
      syncEnabled: config.sync_enabled,
      shopId: config.shop_id,
      partnerId: config.partner_id,
      email: config.email ? `${config.email.slice(0, 3)}***` : null,
      hasToken: !!config.access_token && isTokenValid(config),
      tokenExpiresAt: config.token_expires_at || null,
      lastSyncAt: config.last_sync_at,
      lastSyncStatus: config.last_sync_status,
    };
  },

  /**
   * Listar produtos paginados da loja Shopee
   */
  async listProducts(fromIndex = 0, limit = 50) {
    const data = await shopeeRequest('GET', `/mapi/v${API_VERSION}/item/get?from=${fromIndex}&limit=${limit}`);
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
   * Sincronizar todos os produtos Shopee para o ERP
   */
  async syncProductsFromShopee() {
    const config = await getConfig();
    if (!config) throw new Error('Shopee não configurado');

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
        await shopeeRequest('POST', `/mapi/v${API_VERSION}/item/update`, {
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
