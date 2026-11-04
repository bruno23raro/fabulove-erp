/**
 * LojeXa Webhook Handler — Process webhook events from LojeXa Hub
 *
 * Webhooks are sent to the ERP for real-time event processing:
 * - sale.completed: A sale was completed, update inventory and sales records
 * - order.cancelled: An order was cancelled, potentially restore stock
 * - stock.updated: Stock was updated, log for audit
 * - order.created: A new order was created, create order record
 *
 * All webhook requests are signed with HMAC-SHA256 and must be validated.
 */

import crypto from 'node:crypto';
import pool from '../../config/database.js';

// Webhook event types
export const WEBHOOK_EVENTS = {
  SALE_COMPLETED: 'sale.completed',
  ORDER_CANCELLED: 'order.cancelled',
  STOCK_UPDATED: 'stock.updated',
  ORDER_CREATED: 'order.created',
  ORDER_CANCELLED_AUTO: 'order.cancelled_auto',
  STOCK_ADJUSTED: 'stock.adjusted',
};

/**
 * Validate webhook signature using HMAC-SHA256
 *
 * @param {string} payload - Raw request body
 * @param {string} signature - X-Signature header value
 * @param {string} secret - Webhook signing secret
 * @returns {boolean}
 */
export function validateWebhookSignature(payload, signature, secret) {
  if (!payload || !signature || !secret) {
    return false;
  }

  // Support both 'sha256=' and 'hex=' formats
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  const providedSignature = signature.replace(/^(sha256=|hex=)/, '');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(providedSignature, 'hex')
    );
  } catch {
    return false;
  }
}

/**
 * Generate event ID for tracking
 * @returns {string}
 */
export function generateEventId() {
  return crypto.randomUUID();
}

/**
 * Parse and validate webhook payload
 *
 * @param {string} rawBody - Raw request body
 * @param {string} signature - X-Signature header
 * @param {string} secret - Webhook secret
 * @returns {{valid: boolean, event: Object|null, error: string|null}}
 */
export function parseWebhookPayload(rawBody, signature, secret) {
  // Validate signature first
  if (!validateWebhookSignature(rawBody, signature, secret)) {
    return {
      valid: false,
      event: null,
      error: 'Invalid webhook signature',
    };
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch (parseError) {
    return {
      valid: false,
      event: null,
      error: `Invalid JSON payload: ${parseError.message}`,
    };
  }

  // Validate required fields
  if (!event.event) {
    return {
      valid: false,
      event: null,
      error: 'Missing event type',
    };
  }

  if (!event.data) {
    return {
      valid: false,
      event: null,
      error: 'Missing event data',
    };
  }

  return {
    valid: true,
    event,
    error: null,
  };
}

/**
 * Handle webhook event
 *
 * @param {Object} event - Parsed event object
 * @param {string} eventType - Event type (e.g., 'sale.completed')
 * @param {Object} data - Event data
 * @returns {Promise<Object>}
 */
export async function handleWebhookEvent(event, eventType, data) {
  const eventId = generateEventId();
  const timestamp = new Date().toISOString();

  try {
    switch (eventType) {
      case WEBHOOK_EVENTS.SALE_COMPLETED:
        return await handleSaleCompleted(eventId, data);

      case WEBHOOK_EVENTS.ORDER_CANCELLED:
        return await handleOrderCancelled(eventId, data);

      case WEBHOOK_EVENTS.STOCK_UPDATED:
        return await handleStockUpdated(eventId, data);

      case WEBHOOK_EVENTS.ORDER_CREATED:
        return await handleOrderCreated(eventId, data);

      case WEBHOOK_EVENTS.STOCK_ADJUSTED:
        return await handleStockAdjusted(eventId, data);

      default:
        return {
          eventId,
          processed: false,
          warning: `Unknown event type: ${eventType}`,
          receivedAt: timestamp,
        };
    }
  } catch (error) {
    console.error(`[Webhook] Error processing ${eventType}:`, error);
    return {
      eventId,
      processed: false,
      error: error.message,
      receivedAt: timestamp,
    };
  }
}

/**
 * Handle sale.completed event
 * Updates sales records and reduces inventory
 */
async function handleSaleCompleted(eventId, data) {
  const { order_id, sku, quantity, price, total_amount } = data;

  if (!order_id) {
    return { eventId, processed: false, error: 'Missing order_id' };
  }

  // Insert sales record
  const result = await pool.query(`
    INSERT INTO sales (order_id, sku, quantity, price, total_amount, source, created_at)
    VALUES ($1, $2, $3, $4, $5, 'lojexa', NOW())
    ON CONFLICT (order_id, sku) DO NOTHING
    RETURNING id
  `, [order_id, sku, quantity, price, total_amount]);
  // eslint-disable-next-line no-unused-vars
  const { rows } = result;

  // Update stock
  if (sku && quantity > 0) {
    await pool.query(`
      UPDATE products
      SET stock = GREATEST(0, stock - $1), updated_at = NOW()
      WHERE sku = $2
    `, [quantity, sku]);
  }

  // Log webhook event
  await pool.query(`
    INSERT INTO webhook_events (event_id, event_type, order_id, sku, data, processed_at)
    VALUES ($1, $2, $3, $4, $5, NOW())
  `, [eventId, WEBHOOK_EVENTS.SALE_COMPLETED, order_id, sku, JSON.stringify(data)]);

  return {
    eventId,
    processed: true,
    orderId: order_id,
    sku,
    quantity,
    totalAmount: total_amount,
  };
}

/**
 * Handle order.cancelled event
 * Potentially restores stock
 */
async function handleOrderCancelled(eventId, data) {
  const { order_id, sku, quantity, reason } = data;

  if (!order_id) {
    return { eventId, processed: false, error: 'Missing order_id' };
  }

  // Restore stock if SKU exists
  if (sku && quantity > 0) {
    await pool.query(`
      UPDATE products
      SET stock = stock + $1, updated_at = NOW()
      WHERE sku = $2
    `, [quantity, sku]);
  }

  // Log cancellation
  await pool.query(`
    INSERT INTO order_cancellations (order_id, sku, quantity, reason, cancelled_at, source)
    VALUES ($1, $2, $3, $4, NOW(), 'lojexa')
  `, [order_id, sku, quantity, reason || 'Cancelled via LojeXa webhook']);

  // Log webhook event
  await pool.query(`
    INSERT INTO webhook_events (event_id, event_type, order_id, sku, data, processed_at)
    VALUES ($1, $2, $3, $4, $5, NOW())
  `, [eventId, WEBHOOK_EVENTS.ORDER_CANCELLED, order_id, sku, JSON.stringify(data)]);

  return {
    eventId,
    processed: true,
    orderId: order_id,
    sku,
    quantity,
    restoredStock: quantity,
  };
}

/**
 * Handle stock.updated event
 * Log for audit (ERP is source of truth)
 */
async function handleStockUpdated(eventId, data) {
  const { sku, platform_sku, new_stock, old_stock, reason, channel } = data;

  // Log the stock update for audit
  await pool.query(`
    INSERT INTO stock_movements (sku, platform_sku, type, quantity, balance, reference_type, notes)
    VALUES ($1, $2, 'lojexa_update', 0, $3, 'lojexa_webhook', $4)
  `, [sku, platform_sku, new_stock, `Stock update from LojeXa (${channel}): ${reason || 'N/A'}`]);

  // Log webhook event
  await pool.query(`
    INSERT INTO webhook_events (event_id, event_type, sku, data, processed_at)
    VALUES ($1, $2, $3, $4, NOW())
  `, [eventId, WEBHOOK_EVENTS.STOCK_UPDATED, sku, JSON.stringify(data)]);

  return {
    eventId,
    processed: true,
    sku,
    oldStock: old_stock,
    newStock: new_stock,
    channel,
    note: 'Stock update logged (ERP is source of truth)',
  };
}

/**
 * Handle order.created event
 * Create order record in ERP
 */
async function handleOrderCreated(eventId, data) {
  const { order_id, customer_id, items, total_amount, currency, channel } = data;

  if (!order_id) {
    return { eventId, processed: false, error: 'Missing order_id' };
  }

  // Create order record
  const { rows } = await pool.query(`
    INSERT INTO orders (external_id, customer_id, total_amount, currency, status, channel, created_at)
    VALUES ($1, $2, $3, $4, 'pending', $5, NOW())
    ON CONFLICT (external_id) DO UPDATE SET status = 'pending'
    RETURNING id
  `, [order_id, customer_id, total_amount, currency || 'BRL', channel]);

  // Create order items
  if (items && Array.isArray(items)) {
    for (const item of items) {
      await pool.query(`
        INSERT INTO order_items (order_id, sku, quantity, price)
        VALUES ($1, $2, $3, $4)
      `, [rows[0].id, item.sku || item.product_sku, item.quantity, item.price]);
    }
  }

  // Log webhook event
  await pool.query(`
    INSERT INTO webhook_events (event_id, event_type, order_id, data, processed_at)
    VALUES ($1, $2, $3, $4, NOW())
  `, [eventId, WEBHOOK_EVENTS.ORDER_CREATED, order_id, JSON.stringify(data)]);

  return {
    eventId,
    processed: true,
    orderId: order_id,
    externalId: order_id,
    itemsCount: items?.length || 0,
  };
}

/**
 * Handle stock.adjusted event
 */
async function handleStockAdjusted(eventId, data) {
  const { sku, adjustment, reason, new_stock, channel } = data;

  if (!sku) {
    return { eventId, processed: false, error: 'Missing SKU' };
  }

  // Log the adjustment
  await pool.query(`
    INSERT INTO stock_movements (sku, type, quantity, balance, reference_type, notes)
    VALUES ($1, 'lojexa_adjust', $2, $3, 'lojexa_webhook', $4)
  `, [sku, adjustment, new_stock, `Stock adjustment from LojeXa (${channel}): ${reason || 'N/A'}`]);

  // Log webhook event
  await pool.query(`
    INSERT INTO webhook_events (event_id, event_type, sku, data, processed_at)
    VALUES ($1, $2, $3, $4, NOW())
  `, [eventId, WEBHOOK_EVENTS.STOCK_ADJUSTED, sku, JSON.stringify(data)]);

  return {
    eventId,
    processed: true,
    sku,
    adjustment,
    newStock: new_stock,
  };
}

/**
 * Generate response payload with signature
 * @param {Object} data - Data to sign
 * @param {string} secret - Webhook secret
 * @returns {Object} Response with signature
 */
export function generateResponse(data, secret) {
  const payload = JSON.stringify(data);
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return {
    data,
    signature: `sha256=${signature}`,
  };
}

/**
 * Process incoming webhook request
 * Main entry point for webhook handler
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
export async function processWebhook(req, res) {
  const rawBody = JSON.stringify(req.body);
  const signature = req.headers['x-signature'] || req.headers['X-Signature'];
  const secret = process.env.LOJEXA_WEBHOOK_SECRET;

  // Parse and validate webhook
  const { valid, event, error } = parseWebhookPayload(rawBody, signature, secret);

  if (!valid) {
    console.warn(`[Webhook] Invalid webhook: ${error}`);
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Process the event
  const result = await handleWebhookEvent(event, event.event, event.data);

  // Send response (must be quick for webhook compliance)
  res.json({
    status: 'processed',
    eventId: result.eventId,
    processed: result.processed,
    ...(result.error && { error: result.error }),
    ...(result.warning && { warning: result.warning }),
  });
}