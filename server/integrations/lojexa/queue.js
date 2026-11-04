/**
 * LojeXa Queue — Rate-limited write queue with idempotency
 *
 * Features:
 * - FIFO processing queue
 * - Idempotency-Key support (deduplication)
 * - Rate limit budget per tenant/channel
 * - Exponential backoff on 429 responses
 */

const queues = new Map();

/**
 * Queue item
 */
class QueueItem {
  constructor(idempotencyKey, operation, params, retries = 0) {
    this.idempotencyKey = idempotencyKey;
    this.operation = operation;
    this.params = params;
    this.retries = retries;
    this.createdAt = Date.now();
    this.processedAt = null;
    this.result = null;
    this.error = null;
  }
}

/**
 * Operation types
 */
export const OPERATIONS = {
  UPDATE_STOCK: 'update_stock',
  REPORT_SALE: 'report_sale',
  PUSH_PRODUCT: 'push_product',
  SYNC_PRODUCTS: 'sync_products',
};

/**
 * Get or create queue for tenant/channel
 * @param {string} tenantId - Tenant identifier
 * @param {string} channel - Channel slug
 * @returns {Array} Queue array
 */
export function getQueue(tenantId, channel) {
  const key = `${tenantId}:${channel}`;
  if (!queues.has(key)) {
    queues.set(key, []);
  }
  return queues.get(key);
}

/**
 * Add job to queue
 * @param {string} tenantId - Tenant identifier
 * @param {string} channel - Channel slug
 * @param {string} idempotencyKey - Unique key for deduplication
 * @param {string} operation - Operation type
 * @param {Object} params - Operation parameters
 * @returns {string} Job ID
 */
export function enqueueJob(tenantId, channel, idempotencyKey, operation, params) {
  const queue = getQueue(tenantId, channel);

  // Check for duplicate (idempotency)
  const existing = queue.find(
    (item) =>
      item.idempotencyKey === idempotencyKey &&
      item.processedAt === null &&
      item.error === null
  );

  if (existing) {
    return existing.idempotencyKey;
  }

  const itemId = `${idempotencyKey}-${Date.now()}`;
  const item = new QueueItem(idempotencyKey, operation, params);
  queue.push(item);

  // Process queue
  processQueue(tenantId, channel);

  return itemId;
}

/**
 * Process queue for tenant/channel
 * @param {string} tenantId - Tenant identifier
 * @param {string} channel - Channel slug
 */
async function processQueue(tenantId, channel) {
  const queue = getQueue(tenantId, channel);

  if (queue.length === 0) {
    return;
  }

  const item = queue[0];

  try {
    const result = await executeOperation(tenantId, channel, item);
    item.result = result;
    item.processedAt = Date.now();
  } catch (error) {
    if (error.statusCode === 429) {
      // Rate limit - exponential backoff
      const delay = calculateBackoff(item.retries);
      item.retries++;

      if (item.retries < 5) {
        setTimeout(() => {
          processQueue(tenantId, channel);
        }, delay);
        return;
      }
    }

    item.error = error.message;
    item.processedAt = Date.now();
  }

  // Remove processed item
  queue.shift();

  // Process next item
  if (queue.length > 0) {
    setTimeout(() => processQueue(tenantId, channel), 0);
  }
}

/**
 * Execute operation with rate limit handling
 * @param {string} tenantId - Tenant identifier
 * @param {string} channel - Channel slug
 * @param {QueueItem} item - Queue item
 * @returns {Promise<Object>}
 */
async function executeOperation(tenantId, channel, item) {
  switch (item.operation) {
    case OPERATIONS.UPDATE_STOCK:
      return updateStock(item.params);

    case OPERATIONS.REPORT_SALE:
      return reportSale(item.params);

    case OPERATIONS.PUSH_PRODUCT:
      return pushProduct(item.params);

    case OPERATIONS.SYNC_PRODUCTS:
      return syncProducts(item.params);

    default:
      throw new Error(`Unknown operation: ${item.operation}`);
  }
}

/**
 * Calculate exponential backoff with jitter
 * @param {number} retryCount - Retry attempt number
 * @returns {number} Delay in milliseconds
 */
export function calculateBackoff(retryCount) {
  const baseDelay = 1000; // 1 second
  const exponentialDelay = baseDelay * Math.pow(2, retryCount);
  const jitter = Math.random() * 0.5 * exponentialDelay;
  return exponentialDelay + jitter;
}

/**
 * Mock operations (replace with real API calls)
 */
async function updateStock(_params) {
  // Implementation would call LojeXa API
  return { success: true, updated: true };
}

async function reportSale(_params) {
  // Implementation would call LojeXa API
  return { success: true, reported: true };
}

async function pushProduct(_params) {
  // Implementation would call LojeXa API
  return { success: true, remoteId: 'sku-' + _params.sku };
}

async function syncProducts(_params) {
  // Implementation would call LojeXa API
  return { success: true, synced: _params.limit || 100 };
}

/**
 * Get queue stats
 * @param {string} tenantId - Tenant identifier
 * @param {string} channel - Channel slug
 * @returns {Object}
 */
export function getQueueStats(tenantId, channel) {
  const queue = getQueue(tenantId, channel);
  return {
    queueSize: queue.length,
    pending: queue.length,
    processed: queue.filter((item) => item.processedAt).length,
    errors: queue.filter((item) => item.error).length,
  };
}

/**
 * Clear queue for tenant/channel
 * @param {string} tenantId - Tenant identifier
 * @param {string} channel - Channel slug
 */
export function clearQueue(tenantId, channel) {
  const key = `${tenantId}:${channel}`;
  queues.delete(key);
}

export default {
  getQueue,
  enqueueJob,
  getQueueStats,
  clearQueue,
  calculateBackoff,
  OPERATIONS,
};