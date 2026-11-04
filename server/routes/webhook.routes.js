/**
 * Webhook Routes — LojeXa integration endpoints
 *
 * Public endpoint:
 *   POST /api/webhooks/lojexa - Receive webhook from LojeXa
 *   GET  /api/webhooks/health  - Health check
 */

import { Router } from 'express';
import {
  handleLojeXaWebhook,
  getQueueStatus,
  getWebhookHealth
} from '../controllers/webhook.controller.js';

const router = Router();

// LojeXa webhook endpoint (public - no auth required)
// LojeXa will call this with events (stock updates, sales, etc.)
router.post('/lojexa', handleLojeXaWebhook);

// Health check for monitoring
router.get('/health', (req, res) => {
  const health = getWebhookHealth();
  res.json({ success: true, data: health });
});

// Queue status for monitoring (protected - admin/manager only)
router.get('/queue', (req, res) => {
  const status = getQueueStatus();
  res.json({ success: true, data: status });
});

export default router;