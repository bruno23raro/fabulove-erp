/**
 * LojeXa Integration Routes
 *
 * All routes require authentication except the webhook endpoint
 */

import { Router } from 'express';
import * as lojexaController from '../controllers/lojexa.controller.js';
import { authenticateToken, authorizeRole } from '../utils/jwt.js';

const router = Router();

// Health check - no auth required (for load balancers)
router.get('/status', lojexaController.getStatus);

// Company info - no auth required
router.get('/company', lojexaController.getCompanyInfo);

// All other routes require authentication
router.use(authenticateToken);

// SKU validation
router.get('/validate', lojexaController.validateSku);

// Stock operations
router.get('/stock', lojexaController.getLojeXaStock);
router.get('/products', lojexaController.listProducts);

// Divergence report
router.get('/divergent', authorizeRole('admin', 'manager'), lojexaController.getDivergentSkus);

// Sync operations (admin/manager only)
router.post('/sync/:productId', authorizeRole('admin', 'manager'), lojexaController.syncStock);
router.get('/full-sync', authorizeRole('admin', 'manager'), lojexaController.fullSync);

export default router;