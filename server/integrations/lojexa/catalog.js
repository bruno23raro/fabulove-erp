/**
 * LojeXa Catalog — Marketplace channels and product catalog management
 *
 * This module manages the catalog of products and their availability
 * across different marketplace channels connected through LojeXa Hub.
 *
 * Channels available through LojeXa:
 * - shopee: Shopee marketplace (Asia-Pacific)
 * - mercadolivre: Mercado Livre (Brazil)
 * - magalu: Magalu (Brazil)
 * - amazon: Amazon marketplace
 * - aliexpress: AliExpress
 * - etc.
 */

// Available marketplace channels through LojeXa
export const CHANNELS = {
  SHOPEE: 'shopee',
  MERCADOLIVRE: 'mercadolivre',
  MAGALU: 'magalu',
  AMAZON: 'amazon',
  ALIEXPRESS: 'aliexpress',
  CENEO: 'ceneo',
  EBAY: 'ebay',
  WISH: 'wish',
  OEM: 'oem', // OEM/Custom storefronts
  UNKNOWN: 'unknown',
};

// Channel configuration and metadata
export const CHANNEL_CONFIG = {
  [CHANNELS.SHOPEE]: {
    name: 'Shopee',
    region: 'Asia-Pacific',
    currency: 'USD',
    languages: ['en', 'zh', 'ja', 'ko', 'th', 'vi', 'id', 'ms'],
    hasOAuth: true,
    apiSupport: true,
    webhookSupport: true,
    stockSync: true,
    priceSync: true,
  },
  [CHANNELS.MERCADOLIVRE]: {
    name: 'Mercado Livre',
    region: 'Latin America',
    currency: 'BRL',
    languages: ['pt', 'es'],
    hasOAuth: true,
    apiSupport: true,
    webhookSupport: true,
    stockSync: true,
    priceSync: true,
  },
  [CHANNELS.MAGALU]: {
    name: 'Magalu',
    region: 'Brazil',
    currency: 'BRL',
    languages: ['pt'],
    hasOAuth: true,
    apiSupport: true,
    webhookSupport: true,
    stockSync: true,
    priceSync: true,
  },
  [CHANNELS.AMAZON]: {
    name: 'Amazon',
    region: 'Global',
    currency: ['USD', 'BRL', 'EUR', 'GBP'],
    languages: ['en', 'es', 'de', 'fr', 'it', 'ja'],
    hasOAuth: true,
    apiSupport: true,
    webhookSupport: true,
    stockSync: true,
    priceSync: true,
  },
  [CHANNELS.ALIEXPRESS]: {
    name: 'AliExpress',
    region: 'Global',
    currency: 'USD',
    languages: ['en'],
    hasOAuth: true,
    apiSupport: true,
    webhookSupport: true,
    stockSync: true,
    priceSync: true,
  },
  [CHANNELS.CENEO]: {
    name: 'Ceneo',
    region: 'Poland',
    currency: 'PLN',
    languages: ['pl'],
    hasOAuth: false,
    apiSupport: true,
    webhookSupport: true,
    stockSync: true,
    priceSync: true,
  },
  [CHANNELS.EBAY]: {
    name: 'eBay',
    region: 'Global',
    currency: ['USD', 'EUR', 'GBP'],
    languages: ['en', 'de', 'fr', 'it', 'es'],
    hasOAuth: true,
    apiSupport: true,
    webhookSupport: true,
    stockSync: true,
    priceSync: true,
  },
  [CHANNELS.WISH]: {
    name: 'Wish',
    region: 'Global',
    currency: 'USD',
    languages: ['en'],
    hasOAuth: false,
    apiSupport: true,
    webhookSupport: false,
    stockSync: true,
    priceSync: true,
  },
  [CHANNELS.OEM]: {
    name: 'OEM Storefront',
    region: 'Custom',
    currency: 'BRL',
    languages: ['pt'],
    hasOAuth: false,
    apiSupport: true,
    webhookSupport: false,
    stockSync: true,
    priceSync: true,
  },
};

/**
 * Get all available channels
 * @returns {string[]}
 */
export function getChannelList() {
  return Object.values(CHANNELS);
}

/**
 * Get channel configuration
 * @param {string} channel - Channel identifier
 * @returns {Object|null}
 */
export function getChannelConfig(channel) {
  return CHANNEL_CONFIG[channel] || null;
}

/**
 * Check if a channel is supported
 * @param {string} channel - Channel identifier
 * @returns {boolean}
 */
export function isChannelSupported(channel) {
  return Object.values(CHANNELS).includes(channel);
}

/**
 * Get channels that support a specific feature
 * @param {string} feature - Feature name (oauth, webhook, stockSync, priceSync)
 * @returns {string[]}
 */
export function getChannelsByFeature(feature) {
  return Object.entries(CHANNELS)
    .filter(([_, channel]) => feature === 'oauth' && CHANNEL_CONFIG[channel]?.hasOAuth)
    .filter(([_, channel]) => feature === 'webhook' && CHANNEL_CONFIG[channel]?.webhookSupport)
    .filter(([_, channel]) => feature === 'stockSync' && CHANNEL_CONFIG[channel]?.stockSync)
    .filter(([_, channel]) => feature === 'priceSync' && CHANNEL_CONFIG[channel]?.priceSync)
    .map(([channel]) => channel);
}

/**
 * Get primary channel for a region
 * @param {string} region - Region identifier
 * @returns {string|null}
 */
export function getPrimaryChannelForRegion(region) {
  const regionMap = {
    'Asia-Pacific': CHANNELS.SHOPEE,
    'Latin America': CHANNELS.MERCADOLIVRE,
    'Brazil': CHANNELS.MAGALU,
    'Europe': CHANNELS.EBAY,
    'Global': CHANNELS.AMAZON,
  };
  return regionMap[region] || null;
}

/**
 * Product catalog item
 * @typedef {Object} CatalogItem
 * @property {string} sku - Product SKU
 * @property {string} name - Product name
 * @property {string} barcode - Product barcode (GTIN)
 * @property {number} price - Price in cents (integer)
 * @property {number} stock - Available stock
 * @property {boolean} isActive - Whether product is active
 * @property {string} categoryId - Category ID
 * @property {string} imageUrl - Product image URL
 * @property {string} description - Product description
 * @property {Object<string, number>} stockByChannel - Stock by marketplace channel
 */

/**
 * Create a catalog item
 * @param {Object} data - Product data
 * @returns {CatalogItem}
 */
export function createCatalogItem(data) {
  const { sku, name, barcode, price, stock, isActive, categoryId, imageUrl, description } = data;

  return {
    sku,
    name: name || sku, // Fallback to SKU as name
    barcode: barcode || '',
    price: typeof price === 'number' ? price : parseInt(price, 10) || 0,
    stock: stock || 0,
    isActive: isActive !== false,
    categoryId: categoryId || '',
    imageUrl: imageUrl || '',
    description: description || '',
    stockByChannel: {},
  };
}

/**
 * Validate a catalog item
 * @param {CatalogItem} item - Item to validate
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validateCatalogItem(item) {
  const errors = [];

  if (!item.sku || item.sku.length < 1) {
    errors.push('SKU is required');
  }

  if (!item.name || item.name.length < 1) {
    errors.push('Name is required');
  }

  if (item.price < 0) {
    errors.push('Price cannot be negative');
  }

  if (item.stock < 0) {
    errors.push('Stock cannot be negative');
  }

  if (item.active === false) {
    // Inactive products are valid but should be noted
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Catalog operations
 */
export const Catalog = {
  /**
   * Get catalog items for a specific channel
   * @param {string} channel - Channel identifier
   * @param {Object} options - Query options
   * @returns {Promise<CatalogItem[]>}
   */
  async getByChannel(channel, options = {}) {
    // This would be implemented by the adapter layer
    // For now, provide the structure
    const { page = 1, limit = 100, onlyActive = true } = options; // eslint-disable-line no-unused-vars

    // Placeholder - actual implementation in adapter
    return [];
  },

  /**
   * Get stock distribution across channels for a SKU
   * @param {string} sku - SKU to look up
   * @returns {Promise<Object>}
   */
  async getStockDistribution(sku) {
    // Placeholder - actual implementation via LojeXa API
    return {
      sku,
      channels: {},
      total: 0,
    };
  },

  /**
   * Check if SKU exists in all connected channels
   * @param {string} sku - SKU to check
   * @returns {Promise<Object>}
   */
  async checkAvailability(sku) {
    return {
      sku,
      channels: {},
      existsInAll: false,
      missingChannels: [],
    };
  },

  /**
   * Get channel inventory report
   * @param {string} channel - Channel identifier
   * @param {Object} options - Report options
   * @returns {Promise<Object>}
   */
  async getChannelReport(channel, options = {}) {
    const { sku } = options; // fromDate and toDate unused in placeholder

    return {
      channel,
      sku,
      report: [],
      totalItems: 0,
      generatedAt: new Date().toISOString(),
    };
  },
};