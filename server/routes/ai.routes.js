/**
 * AI Routes — Endpoints para configuração e uso de IA
 */
import express from 'express';
import { authenticateToken } from '../utils/jwt.js';
import * as aiController from '../controllers/ai.controller.js';

const router = express.Router();
router.use(authenticateToken);

// Configuração
router.get('/config', aiController.getConfig);
router.post('/test', aiController.testConnection);

// Geração
router.post('/generate', aiController.generate);
router.post('/describe-product', aiController.describeProduct);

export default router;
