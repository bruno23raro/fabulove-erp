/**
 * Rotas de Produtos
 *
 * GET    /api/products              — listar (com search, category_id, limit, offset)
 * GET    /api/products/low-stock    — produtos com estoque baixo
 * GET    /api/products/:id          — buscar por ID
 * POST   /api/products              — criar
 * PUT    /api/products/:id          — atualizar
 * DELETE /api/products/:id          — excluir
 * PATCH  /api/products/:id/stock    — ajustar estoque
 */

import { Router } from 'express';
import {
  listProducts,
  listLowStock,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  adjustStock,
} from '../controllers/product.controller.js';
import { authenticateToken, authorizeRole } from '../utils/jwt.js';

const router = Router();

router.use(authenticateToken);

router.get('/low-stock', listLowStock);
router.get('/', listProducts);
router.get('/:id', getProduct);

router.post('/', authorizeRole('admin', 'manager'), createProduct);
router.put('/:id', authorizeRole('admin', 'manager'), updateProduct);
router.delete('/:id', authorizeRole('admin'), deleteProduct);
router.patch('/:id/stock', authorizeRole('admin', 'manager', 'operator'), adjustStock);

export default router;
