/**
 * Rotas de Pedidos
 *
 * GET    /api/orders                   — listar (com status, customer_id, datas, limit, offset)
 * GET    /api/orders/:id               — buscar por ID (com itens)
 * POST   /api/orders                   — criar (valida estoque)
 * PUT    /api/orders/:id               — atualizar (não permite cancelados/entregues)
 * PATCH  /api/orders/:id/status        — atualizar status
 * DELETE /api/orders/:id               — excluir (apenas pending)
 */

import { Router } from 'express';
import {
  listOrders,
  getOrder,
  createOrder,
  updateOrder,
  updateOrderStatus,
  deleteOrder,
} from '../controllers/order.controller.js';
import { authenticateToken, authorizeRole } from '../utils/jwt.js';

const router = Router();

router.use(authenticateToken);

router.get('/', listOrders);
router.get('/:id', getOrder);

router.post('/', authorizeRole('admin', 'manager', 'operator'), createOrder);
router.put('/:id', authorizeRole('admin', 'manager'), updateOrder);
router.patch('/:id/status', authorizeRole('admin', 'manager', 'operator'), updateOrderStatus);
router.delete('/:id', authorizeRole('admin', 'manager'), deleteOrder);

export default router;
