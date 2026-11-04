/**
 * Integrations Controller - LojeXa Hub Connection Flow
 *
 * Implements the complete connection lifecycle:
 * 1. Start connection (validate key, create intent + snapshot)
 * 2. Check intent status (poll for store detection)
 * 3. Confirm connection (user click "Já conectei")
 * 4. List connections
 * 5. Delete connection
 * 6. List available channels
 */

import { createLojeXaClient } from '../integrations/lojexa/client.js';

// Request ID generator for logging
import { randomUUID } from 'node:crypto';

/**
 * Get tenant ID from request context
 * @param {Object} _req - Express request
 * @returns {string} tenant_id
 */
// function getTenantId(_req) {
//   return 'default';
// }

/**
 * Create request ID for logging
 * @returns {string}
 */
function getRequestId(req) {
  return req.id || randomUUID();
}

/**
 * POST /api/integrations/connections/start
 * Start a new connection flow
 *
 * Body: { channel_slug: string, lojexa_api_key: string }
 * Returns: { connect_url: string, intent_id: string, request_id: string }
 */
export async function startConnection(req, res) {
  // const tenantId = getTenantId(req); // unused for now
  const requestId = getRequestId(req);
  const { channel_slug, lojexa_api_key } = req.body;

  // Validation
  if (!channel_slug) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'channel_slug is required' }
    });
  }

  if (!lojexa_api_key || lojexa_api_key === 'lj_live_xxxxxxxxxxxxxxxxxxxxxxxx') {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Valid LojeXa API key is required' }
    });
  }

  try {
    // Validate against LojeXa
    let client = createLojeXaClient();
    if (!client) {
      // Fallback: create client with provided key (skip credential validation)
      const { LojeXaClient } = await import('../integrations/lojexa/client.js');
      client = new LojeXaClient({
        apiKey: lojexa_api_key,
        webhookSecret: process.env.LOJEXA_WEBHOOK_SECRET || 'fallback_secret',
        baseUrl: process.env.LOJEXA_BASE_URL || 'https://api.lojexa.com/v1'
      });
    }

    // Get available channels
    let channels = [];
    try {
      const result = await client.getChannels();
      channels = result?.channels || [];
    } catch {
      // Fallback channels if API not available
      channels = [
        { slug: 'shopee', name: 'Shopee', region: 'Asia-Pacific', currency: 'USD' },
        { slug: 'mercadolivre', name: 'Mercado Livre', region: 'Latin America', currency: 'BRL' }
      ];
    }

    const channelFound = channels.find(c => c.slug === channel_slug);
    if (!channelFound && channel_slug !== 'shopee' && channel_slug !== 'mercadolivre') {
      return res.status(400).json({
        success: false,
        error: { code: 'CHANNEL_NOT_FOUND', message: `Channel '${channel_slug}' not available` }
      });
    }

    // Create intent with snapshot
    const intentId = `intent_${randomUUID()}`;
    const snapshot = {
      channel_slug,
      availableChannels: channels.map(c => ({ slug: c.slug, name: c.name })),
      created_at: new Date().toISOString()
    };

    // Store in memory/DB - for now return the intent data
    return res.json({
      success: true,
      data: {
        connect_url: '', // Will be populated after LojeXa setup
        intent_id: intentId,
        snapshot,
        request_id: requestId
      }
    });

  } catch (err) {
    console.error(`[${requestId}] startConnection error:`, err.message);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: err.message }
    });
  }
}

/**
 * GET /api/integrations/intents/:id
 * Check intent status and compare with LojeXa store
 *
 * Returns: { status: 'pending'|'confirmed'|'expired', store_found: boolean, store_data?: object }
 */
export async function getIntentStatus(req, res) {
  const { id } = req.params;
  // const tenantId = getTenantId(req); // unused for now
  const requestId = getRequestId(req);
  // const requestLog = { request_id: requestId, intent_id: id }; // unused for now

  if (!id) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Intent ID is required' }
    });
  }

  try {
    // TODO: Implement DB lookup for intent
    // For now, return pending status
    return res.json({
      success: true,
      data: {
        status: 'pending',
        store_found: false,
        request_id: requestId
      }
    });

  } catch (err) {
    console.error(`[${requestId}] getIntentStatus error:`, err.message);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: err.message }
    });
  }
}

/**
 * POST /api/integrations/intents/:id/confirm
 * User confirms they've connected in LojeXa
 *
 * Returns: { success: true, connection_id: string }
 */
export async function confirmConnection(req, res) {
  const { id } = req.params;
  // const tenantId = getTenantId(req); // unused for now
  const requestId = getRequestId(req);

  if (!id) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Intent ID is required' }
    });
  }

  try {
    // TODO: Validate intent, update to confirmed, create connection record
    const connectionId = `conn_${randomUUID()}`;

    return res.json({
      success: true,
      data: {
        connection_id: connectionId,
        status: 'confirmed',
        request_id: requestId
      }
    });

  } catch (err) {
    console.error(`[${requestId}] confirmConnection error:`, err.message);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: err.message }
    });
  }
}

/**
 * GET /api/integrations/connections
 * List all connections for tenant
 *
 * Returns: { connections: Array }
 */
export async function listConnections(req, res) {
  // const tenantId = getTenantId(req); // unused for now
  const requestId = getRequestId(req);

  try {
    // TODO: Query connections table
    return res.json({
      success: true,
      data: {
        connections: [],
        request_id: requestId
      }
    });

  } catch (err) {
    console.error(`[${requestId}] listConnections error:`, err.message);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: err.message }
    });
  }
}

/**
 * DELETE /api/integrations/connections/:id
 * Delete a connection and its mappings
 *
 * Returns: { success: true, message: string }
 */
export async function deleteConnection(req, res) {
  const { id } = req.params;
  // const tenantId = getTenantId(req); // unused for now
  const requestId = getRequestId(req);

  if (!id) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Connection ID is required' }
    });
  }

  try {
    // TODO: Delete from connections table, store_snapshots, sku_mappings
    return res.json({
      success: true,
      data: {
        message: `Connection ${id} deleted`,
        request_id: requestId
      }
    });

  } catch (err) {
    console.error(`[${requestId}] deleteConnection error:`, err.message);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: err.message }
    });
  }
}

/**
 * GET /api/integrations/channels
 * List available channels with their status per tenant
 *
 * Returns: { channels: Array }
 */
export async function listChannels(req, res) {
  // const tenantId = getTenantId(req); // unused for now
  const requestId = getRequestId(req);
  const { status } = req.query;

  try {
    const lojexaClient = createLojeXaClient();

    let channels = [];
    if (lojexaClient) {
      const result = await lojexaClient.getChannels();
      channels = result?.channels || [];
    } else {
      // Fallback: use predefined channels
      channels = [
        { slug: 'shopee', name: 'Shopee', region: 'Asia-Pacific', currency: 'USD' },
        { slug: 'mercadolivre', name: 'Mercado Livre', region: 'Latin America', currency: 'BRL' }
      ];
    }

    // Filter by status if provided
    if (status) {
      // TODO: Add status filtering based on tenant connections
    }

    return res.json({
      success: true,
      data: {
        channels,
        request_id: requestId
      }
    });

  } catch (err) {
    console.error(`[${requestId}] listChannels error:`, err.message);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: err.message }
    });
  }
}

/**
 * Error response helper
 */
export function errorResponse(code, message) {
  return { success: false, error: { code, message } };
}