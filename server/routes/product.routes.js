/**
 * Rotas de Produtos
 *
 * GET    /api/products              — listar (com search, category_id, limit, offset)
 * GET    /api/products/low-stock    — produtos com estoque baixo
 * GET    /api/products/:id          — buscar por ID
 * POST   /api/products              — criar
 * POST   /api/products/import       — importar CSV (upsert por barcode)
 * PUT    /api/products/:id          — atualizar
 * DELETE /api/products/:id          — excluir
 * PATCH  /api/products/:id/stock    — ajustar estoque
 */

import { Router } from 'express';
import multer from 'multer';
import {
  listProducts,
  listLowStock,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  adjustStock,
  importProducts,
} from '../controllers/product.controller.js';
import { authenticateToken, authorizeRole } from '../utils/jwt.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.use(authenticateToken);

router.get('/low-stock', listLowStock);
router.get('/', listProducts);
router.get('/:id', getProduct);

router.post('/', authorizeRole('admin', 'manager'), createProduct);
router.post('/import', authorizeRole('admin', 'manager'), upload.single('csv'), importProducts);
router.put('/:id', authorizeRole('admin', 'manager'), updateProduct);
router.delete('/:id', authorizeRole('admin'), deleteProduct);
router.patch('/:id/stock', authorizeRole('admin', 'manager', 'operator'), adjustStock);

export default router;
