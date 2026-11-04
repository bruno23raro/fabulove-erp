/**
 * Integrations Routes - LojeXa Hub Connection Flow
 *
 * All routes require authentication except the webhook endpoint.
 * Implements the complete connection lifecycle through LojeXa Hub.
 */

import { Router } from 'express';
import { authenticateToken, authorizeRole } from '../utils/jwt.js';
import {
  startConnection,
  getIntentStatus,
  confirmConnection,
  listConnections,
  deleteConnection,
  listChannels
} from '../controllers/integrations.controller.js';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * POST /api/integrations/connections/start
 * Start a new connection flow
 * Body: { channel_slug: string, lojexa_api_key: string }
 * Returns: { connect_url, intent_id, snapshot, request_id }
 */
router.post('/connections/start', authorizeRole('admin', 'manager'), startConnection);

/**
 * GET /api/integrations/intents/:id
 * Check intent status and compare with LojeXa store
 * Returns: { status, store_found, store_data? }
 */
router.get('/intents/:id', authorizeRole('admin', 'manager'), getIntentStatus);

/**
 * POST /api/integrations/intents/:id/confirm
 * User confirms they've connected in LojeXa
 * Returns: { success, connection_id }
 */
router.post('/intents/:id/confirm', authorizeRole('admin', 'manager'), confirmConnection);

/**
 * GET /api/integrations/connections
 * List all connections for tenant
 * Returns: { connections: Array }
 */
router.get('/connections', authorizeRole('admin', 'manager'), listConnections);

/**
 * DELETE /api/integrations/connections/:id
 * Delete a connection and its mappings
 * Returns: { success, message }
 */
router.delete('/connections/:id', authorizeRole('admin', 'manager'), deleteConnection);

/**
 * GET /api/integrations/channels
 * List available channels with their status
 * Returns: { channels: Array }
 */
router.get('/channels', authorizeRole('admin', 'manager'), listChannels);

export default router;