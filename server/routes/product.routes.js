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
 *
 * Universal Import (multi-format):
 * POST /api/products/import/analyze — analisar arquivo, detectar formato e mapear colunas
 * POST /api/products/import         — importar com mapeamento explícito
 * GET  /api/products/import/profiles — perfis de importação salvos
 * POST /api/products/import/profiles — salvar perfil
 * DELETE /api/products/import/profiles/:id — excluir perfil
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
} from '../controllers/product.controller.js';
import importController from '../controllers/import.controller.js';
import { authenticateToken, authorizeRole } from '../utils/jwt.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

router.use(authenticateToken);

router.get('/low-stock', listLowStock);
router.get('/', listProducts);
router.get('/:id', getProduct);

router.post('/', authorizeRole('admin', 'manager'), createProduct);
router.put('/:id', authorizeRole('admin', 'manager'), updateProduct);
router.delete('/:id', authorizeRole('admin'), deleteProduct);
router.patch('/:id/stock', authorizeRole('admin', 'manager', 'operator'), adjustStock);

// Universal import routes (analyze, profiles) — mounted at root since controller has /import prefix internally
router.use('/', importController)

export default router;
