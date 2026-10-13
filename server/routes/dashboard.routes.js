/**
 * Rotas do Dashboard
 *
 * GET /api/dashboard   — métricas consolidadas (pedidos, clientes, receita, estoque)
 */

import { Router } from 'express';
import { getDashboard } from '../controllers/dashboard.controller.js';
import { authenticateToken } from '../utils/jwt.js';

const router = Router();

router.use(authenticateToken);

router.get('/', getDashboard);

export default router;
