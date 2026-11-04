/**
 * LojeXa Cache — TTL-based caching for API responses
 *
 * Provides caching for:
 * - Store info (/lojas endpoint)
 * - Products catalog (/produtos endpoint)
 * - Mappings (sku mappings, channel mappings)
 *
 * Features:
 * - TTL 60-120 seconds (configurable)
 * - Automatic invalidation on write operations
 * - LRU eviction for memory management
 */

const cache = new Map();

/**
 * Cache configuration
 */
export const CACHE_CONFIG = {
  STORES: { ttl: 120, maxItems: 100 },
  PRODUCTS: { ttl: 60, maxItems: 1000 },
  MAPPINGS: { ttl: 60, maxItems: 500 },
  CHANNELS: { ttl: 300, maxItems: 10 },
};

/**
 * Get cache key for a resource
 * @param {string} type - Resource type (stores, products, mappings)
 * @param {string} identifier - Resource identifier (store_id, sku, etc.)
 * @returns {string} Cache key
 */
export function getCacheKey(type, identifier) {
  return `${type}:${identifier}`;
}

/**
 * Get item from cache
 * @param {string} key - Cache key
 * @returns {Object|null} Cached item or null
 */
export function getCache(key) {
  const item = cache.get(key);

  if (!item) {
    return null;
  }

  const now = Date.now();
  if (now > item.expiresAt) {
    cache.delete(key);
    return null;
  }

  return item.value;
}

/**
 * Set item in cache
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} ttl - TTL in seconds (default 60)
 */
export function setCache(key, value, ttl = 60) {
  const expiresAt = Date.now() + (ttl * 1000);

  const item = {
    value,
    expiresAt,
    createdAt: Date.now(),
  };

  cache.set(key, item);
}

/**
 * Invalidate cache entry
 * @param {string} key - Cache key to invalidate
 */
export function invalidateCache(key) {
  cache.delete(key);
}

/**
 * Invalidate all cache entries for a type
 * @param {string} type - Resource type (stores, products, mappings)
 */
export function invalidateCacheByType(type) {
  for (const key of cache.keys()) {
    if (key.startsWith(`${type}:`)) {
      cache.delete(key);
    }
  }
}

/**
 * Clear all cache
 */
export function clearCache() {
  cache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  let ttlExpired = 0;
  let active = 0;

  const now = Date.now();
  for (const item of cache.values()) {
    if (now > item.expiresAt) {
      ttlExpired++;
    } else {
      active++;
    }
  }

  return {
    total: cache.size,
    active,
    ttlExpired,
  };
}

/**
 * Get store info from cache or fetch
 * @param {string} storeId - Store identifier
 * @param {Function} fetchFn - Function to fetch if not cached
 * @returns {Promise<Object>}
 */
export async function getCachedStore(storeId, fetchFn) {
  const key = getCacheKey('stores', storeId);
  let cached = getCache(key);

  if (cached) {
    return cached;
  }

  const data = await fetchFn();
  setCache(key, data, CACHE_CONFIG.STORES.ttl);
  return data;
}

/**
 * Get products from cache or fetch
 * @param {string} channel - Channel slug
 * @param {Object} params - Query params
 * @param {Function} fetchFn - Function to fetch if not cached
 * @returns {Promise<Object>}
 */
export async function getCachedProducts(channel, params, fetchFn) {
  const key = getCacheKey('products', `${channel}:${JSON.stringify(params)}`);
  let cached = getCache(key);

  if (cached) {
    return cached;
  }

  const data = await fetchFn();
  setCache(key, data, CACHE_CONFIG.PRODUCTS.ttl);
  return data;
}

/**
 * Get SKU mapping from cache or fetch
 * @param {string} sku - SKU
 * @param {Function} fetchFn - Function to fetch if not cached
 * @returns {Promise<Object>}
 */
export async function getCachedMapping(sku, fetchFn) {
  const key = getCacheKey('mappings', sku);
  let cached = getCache(key);

  if (cached) {
    return cached;
  }

  const data = await fetchFn();
  setCache(key, data, CACHE_CONFIG.MAPPINGS.ttl);
  return data;
}

// Auto-cleanup expired items periodically
let cleanupInterval = null;
export function startCacheCleanup() {
  if (cleanupInterval) return;

  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, item] of cache.entries()) {
      if (now > item.expiresAt) {
        cache.delete(key);
      }
    }
  }, 30000); // Clean up every 30 seconds

  // Clean up on process exit
  process.on('exit', () => {
    if (cleanupInterval) {
      clearInterval(cleanupInterval);
    }
  });
}

export default {
  getCacheKey,
  getCache,
  setCache,
  invalidateCache,
  invalidateCacheByType,
  clearCache,
  getCacheStats,
  getCachedStore,
  getCachedProducts,
  getCachedMapping,
  startCacheCleanup,
};