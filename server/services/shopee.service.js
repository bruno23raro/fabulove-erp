/**
 * Shopee Partner API Service
 *
 * Integração com a API do Shopee Partner para sincronização de produtos
 * e estoque entre a plataforma Shopee e o PDV do Fabulove ERP.
 *
 * Uso:
 *   - saveConfig()       salva credentials na tabela shopee_config
 *   - getStatus()        retorna estado da integração
 *   - listProducts()     lista produtos paginados da loja Shopee
 *   - syncProducts()     sincroniza produtos Shopee → ERP (upsert por SKU/barcode)
 *   - syncStock()        empurra novo estoque para item Shopee após venda
 *   - exportCsv()        exporta CSV padronizado para importação Shopee
 *   - logAction()        registra log na tabela shopee_sync_logs
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

/**
 * Assinar requisição Shopee com HMAC-SHA256
 * message = method + path + timestamp + apiKey + body + apiSecret
 */
function signRequest(method, path, timestamp, apiKey, apiSecret, body = '') {
  const message = method + path + timestamp + apiKey + body + apiSecret;
  return crypto
    .createHmac('sha256', apiSecret)
    .update(message)
    .digest('base64');
}

/**
 * Fazer chamada HTTP para a API Shopee Partner
 */
async function shopeeRequest(method, path, body = null) {
  const config = await getConfig();
  if (!config) throw new Error('Shopee não configurado. Salve as credenciais primeiro.');

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const bodyStr = body ? JSON.stringify(body) : '';
  const signature = signRequest(method, path, timestamp, config.api_key, config.api_secret, bodyStr);

  const url = `${BASE_URL}/${API_VERSION}${path}`;
  const headers = {
    'Content-Type': 'application/json; charset=UTF-8',
    'Authorization': `HmacSHA256 ${config.api_key}`,
    'X-Signature': signature,
    'X-Timestamp': timestamp,
    'X-Source': 'Partner',
  };
  if (config.shop_id) headers['X-ShopeeShop-Id'] = config.shop_id;

  const res = await fetch(url, {
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

  if (!data || data.error || data.message) {
    throw new Error(`Shopee API error: ${data?.message ?? data?.error ?? JSON.stringify(data)}`);
  }
  return data;
}

// ── Exportados ────────────────────────────────────────────────────────────────

export const ShopeeService = {
  /**
   * Salvar credenciais da Shopee no banco
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
      return { configured: false, syncEnabled: false, shopId: null, lastSyncAt: null, lastSyncStatus: null };
    }
    const { rows } = await pool.query(
      `SELECT last_sync_at, last_sync_status FROM shopee_config ORDER BY id DESC LIMIT 1`
    );
    return {
      configured: true,
      syncEnabled: config.sync_enabled,
      shopId: config.shop_id,
      partnerId: config.partner_id,
      lastSyncAt: config.last_sync_at,
      lastSyncStatus: config.last_sync_status,
    };
  },

  /**
   * Listar produtos paginados da loja Shopee
   * @param {number} fromIndex
   * @param {number} limit
   */
  async listProducts(fromIndex = 0, limit = 50) {
    const data = await shopeeRequest('GET', `/mapi/v${API_VERSION}/item/get?from=${fromIndex}&limit=${limit}`);
    const items = data.items || [];
    // Normalize para formato esperado
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
   * Sincronizar todos os produtos Shopee para o ERP (upsert por SKU ou barcode)
   */
  async syncProductsFromShopee() {
    const config = await getConfig();
    if (!config) throw new Error('Shopee não configurado');

    let totalCreated = 0;
    let totalUpdated = 0;
    let totalErrors = 0;
    let fromIndex = 0;
    const pageSize = 50;

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
          // Tentar encontrar produto existente por SKU
          let product = item.sku
            ? await (await import('../models/product.model.js')).ProductModel.findBySku(item.sku)
            : null;

          // Se não achou por SKU, tenta por barcode
          if (!product && item.barcode) {
            product = await (await import('../models/product.model.js')).ProductModel.findByBarcode(item.barcode);
          }

          const price = (item.price / 10000).toFixed(2); // Shopee envia em centavos
          const priceNum = parseFloat(price) || 0;
          const priceShopee = Math.round((priceNum * 1.19 + 4.71) * 100) / 100;

          if (product) {
            // Atualiza produto existente
            await (await import('../models/product.model.js')).ProductModel.update(product.id, {
              name: item.name,
              sku: item.sku,
              barcode: item.barcode,
              description: item.description,
              price: priceNum,
              stock: item.stock,
              categoryId: null, // mantem categoria existente
              imageUrl: item.image_urls?.[0] || null,
              isActive: item.is_active,
            });
            totalUpdated++;
            await logAction('sync_update', product.id, item.item_id, 'ok', `Atualizado: ${item.name}`);
          } else {
            // Cria novo produto
            const created = await (await import('../models/product.model.js')).ProductModel.create({
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
      if (items.length < pageSize) break; // Última página
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
   * Sincronizar estoque após venda — atualiza item Shopee com novo estoque
   * @param {number} productId — ID do produto no ERP
   * @param {number} quantitySold — quantidade vendida
   */
  async syncStock(productId, quantitySold) {
    const config = await getConfig();
    if (!config || !config.sync_enabled) return { synced: false, reason: 'sync desabilitado' };

    const product = await (await import('../models/product.model.js')).ProductModel.findById(productId);
    if (!product) {
      await logAction('sync_stock', productId, null, 'error', 'Produto não encontrado');
      return { synced: false, reason: 'produto não encontrado' };
    }

    // Encontrar item Shopee correspondente por SKU ou barcode
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
        // Ignore — não bloqueia a venda
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
   * Colunas: image_url, video_url, brand, anvisa_code, barcode, size, description,
   *          variation, color, ncm, origin, cfop, measurement_unit, cest, weight_g,
   *          condition, sku, gtin
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
        escape(''),                   // video_url
        escape(''),                   // brand
        escape(''),                   // anvisa_code
        escape(p.barcode),
        escape(''),                   // size
        escape(p.description),
        escape(''),                   // variation
        escape(''),                   // color
        escape(''),                   // ncm
        escape('Brasil'),             // origin
        escape('5101'),               // cfop (padrão)
        escape('UN'),                  // measurement_unit
        escape(''),                   // cest
        escape(String(p.stock || 0)), // weight_g → usando stock como placeholder
        escape('new'),                // condition
        escape(p.sku),
        escape(''),                   // gtin
      ];
      lines.push(row.join(';'));
    }

    return '﻿' + lines.join('\r\n'); // BOM para Excel
  },

  /**
   * Listar logs de sincronização
   * @param {number} limit
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
