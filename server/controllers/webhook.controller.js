/**
 * Webhook Controller — LojeXa webhook handler
 *
 * Endpoint: POST /api/webhooks/lojexa
 *
 * Flow:
 * 1. Validate HMAC signature
 * 2. Parse event type (sale.completed, stock.updated, order.created, order.cancelled)
 * 3. Queue for async processing
 * 4. Return 2xx immediately (LojeXa retries for up to 48h on failure)
 *
 * Security: Uses timing-safe signature comparison to prevent timing attacks
 */

import pool from '../config/database.js';
import logger from '../utils/logger.js';
import { createLojeXaClient } from '../services/lojexa.client.js';

const lojexaClient = createLojeXaClient();

// In-memory processing queue (in production, use Redis/PubSub)
// Stores events awaiting processing for retry capability
const processingQueue = [];

/**
 * Webhook endpoint - public, no authentication required
 * LojeXa will call this URL with stock/sale updates
 */
export async function handleLojeXaWebhook(req, res) {
  try {
    const signature = req.headers['x-signature'] || req.headers['X-Signature'] || req.headers['x-hub-signature-256'];
    const payload = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

    // Validate webhook signature (HMAC-SHA256)
    if (!lojexaClient || !lojexaClient.validateWebhookSignature(payload, signature)) {
      logger.warn('[LojeXa Webhook] Invalid signature - possible spoofed request', {
        signature: signature?.substring(0, 20) + '...'
      });
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid webhook signature' }
      });
    }

    const { event_type, data, timestamp, event_id } = req.body;

    if (!event_type) {
      logger.warn('[LojeXa Webhook] Missing event_type in payload');
      return res.status(400).json({
        success: false,
        error: { message: 'Missing event_type' }
      });
    }

    logger.info(`[LojeXa Webhook] Processing event: ${event_type}, id: ${event_id}`);

    // Queue for async processing
    const queueItem = {
      event_type,
      data,
      timestamp,
      event_id,
      received_at: new Date().toISOString(),
      payload_signature: signature
    };
    processingQueue.push(queueItem);

    // Process immediately in background (non-blocking)
    // LojeXa expects 2xx reply within seconds
    processWebhookEvent(queueItem)
      .catch(err => {
        logger.error(`[LojeXa Webhook] Async processing error:`, err);
      });

    // Return 2xx immediately - LojeXa will retry up to 48h if we don't ack
    return res.status(200).json({
      success: true,
      message: 'Webhook received and queued for processing',
      event_id
    });

  } catch (error) {
    logger.error('[LojeXa Webhook] Unexpected error:', error);
    // Return 4xx for client errors, 5xx for server errors
    // 5xx will cause LojeXa to retry
    return res.status(500).json({
      success: false,
      error: { message: 'Internal server error' }
    });
  }
}

/**
 * Process webhook events asynchronously
 * This allows time-consuming operations without delaying the 2xx response
 */
async function processWebhookEvent(event) {
  const { event_type, data } = event;

  try {
    switch (event_type) {
      case 'sale.completed':
        await handleSaleCompleted(data);
        break;

      case 'stock.updated':
        await handleStockUpdated(data);
        break;

      case 'order.created':
        await handleOrderCreated(data);
        break;

      case 'order.cancelled':
        await handleOrderCancelled(data);
        break;

      default:
        logger.warn(`[LojeXa Webhook] Unknown event type: ${event_type}`);
    }
  } catch (error) {
    logger.error(`[LojeXa Webhook] Error processing ${event_type}:`, error);
  }
}

/**
 * Handle sale completed event from LojeXa
 * Updates ERP records to match the sale
 */
async function handleSaleCompleted(saleData) {
  const { order_id, items, total } = saleData;

  logger.info('[LojeXa Webhook] Sale completed', { order_id, total, items: items?.length });

  // If items are provided, we could update local records
  // For now, this is informational - ERP is the source of truth for stock
  if (items && Array.isArray(items)) {
    for (const item of items) {
      // Log the sale for audit purposes
      await pool.query(
        `INSERT INTO stock_movements (product_id, type, quantity, balance, reference_type, notes)
         SELECT p.id, 'sale', -${item.quantity}, p.stock, 'lojexa_webhook', $1
         FROM products p WHERE p.sku = $2`,
        [`LojeXa webhook: sale ${order_id}`, item.sku]
      );
    }
  }
}

/**
 * Handle stock update event from LojeXa
 * This is called when LojeXa receives stock from another source
 * We should NOT update ERP stock (ERP is the source of truth)
 * But we can log it for reconciliation
 */
async function handleStockUpdated(stockData) {
  const { sku, quantity, reason, location_id } = stockData;

  if (!sku) {
    logger.warn('[LojeXa Webhook] Stock update missing SKU');
    return;
  }

  logger.info(`[LojeXa Webhook] Stock update received: SKU ${sku} -> ${quantity}`, { reason, location_id });

  // ERP is the source of truth - we DO NOT update stock from webhook
  // This is informational only, for potential reconciliation if needed
  // If you want ERP to become slave to LojeXa, change this logic

  // Optional: Log for audit/reconciliation
  const { rows: products } = await pool.query(
    'SELECT id FROM products WHERE UPPER(sku) = UPPER($1)',
    [sku]
  );

  if (products.length === 0) {
    logger.warn(`[LojeXa Webhook] Product not found for SKU: ${sku}`);
  } else {
    // Log as informational (don't modify stock)
    await pool.query(
      `INSERT INTO stock_movements (product_id, type, quantity, balance, reference_type, reference_id, notes)
       VALUES ($1, 'webhook_received', 0, $2, 'lojexa_webhook', NULL, $3)`,
      [products[0].id, quantity, `Stock update from LojeXa: ${quantity}, reason: ${reason || 'unknown'}`]
    );
  }
}

/**
 * Handle order created event from LojeXa
 */
async function handleOrderCreated(orderData) {
  const { order_id, items, total } = orderData;

  logger.info('[LojeXa Webhook] Order created', { order_id, total, items: items?.length });

  // ERP creates its own orders via the normal flow
  // This is informational for external visibility
}

/**
 * Handle order cancelled event from LojeXa
 * We would need to restore stock in ERP
 */
async function handleOrderCancelled(orderData) {
  const { order_id, items, reason } = orderData;

  logger.info('[LojeXa Webhook] Order cancelled', { order_id, reason });

  // Restore stock in ERP
  if (items && Array.isArray(items)) {
    for (const item of items) {
      const { rows } = await pool.query(
        'SELECT id, stock FROM products WHERE UPPER(sku) = UPPER($1)',
        [item.sku]
      );

      if (rows.length > 0) {
        const productId = rows[0].id;
        const newStock = rows[0].stock + (item.quantity || 1);

        await pool.query(
          'UPDATE products SET stock = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [newStock, productId]
        );

        await pool.query(
          `INSERT INTO stock_movements (product_id, type, quantity, balance, reference_type, notes)
           VALUES ($1, 'restock', $2, $3, 'lojexa_cancelled_order', $4)`,
          [productId, item.quantity || 1, newStock, `LojeXa cancelled order ${order_id}: ${reason}`]
        );
      }
    }
  }
}

/**
 * Get current status of webhook processing queue
 * Used for monitoring/dashboard
 */
export function getQueueStatus() {
  return {
    pending: processingQueue.length,
    items: processingQueue.slice(-10), // Last 10 items
    queueTimestamp: new Date().toISOString()
  };
}

/**
 * Get webhook health status
 */
export function getWebhookHealth() {
  return {
    configured: lojexaClient !== null,
    queuePending: processingQueue.length,
    status: lojexaClient ? 'operational' : 'not_configured'
  };
}