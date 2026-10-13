/**
 * Rotas de Clientes
 *
 * GET    /api/customers              — listar (com search, limit, offset)
 * GET    /api/customers/:id          — buscar por ID (com totais)
 * GET    /api/customers/:id/orders   — histórico de pedidos
 * POST   /api/customers              — criar
 * PUT    /api/customers/:id          — atualizar
 * DELETE /api/customers/:id          — excluir
 */

import { Router } from 'express';
import {
  listCustomers,
  getCustomer,
  getCustomerOrders,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from '../controllers/customer.controller.js';
import { authenticateToken, authorizeRole } from '../utils/jwt.js';

const router = Router();

router.use(authenticateToken);

router.get('/', listCustomers);
router.get('/:id', getCustomer);
router.get('/:id/orders', getCustomerOrders);

router.post('/', authorizeRole('admin', 'manager', 'operator'), createCustomer);
router.put('/:id', authorizeRole('admin', 'manager', 'operator'), updateCustomer);
router.delete('/:id', authorizeRole('admin'), deleteCustomer);

export default router;
