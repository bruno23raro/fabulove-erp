/**
 * Rotas de Categorias
 *
 * GET    /api/categories      — listar todas
 * GET    /api/categories/:id  — buscar por ID
 * POST   /api/categories      — criar
 * PUT    /api/categories/:id  — atualizar
 * DELETE /api/categories/:id  — excluir (bloqueia se tiver produtos)
 */

import { Router } from 'express';
import {
  listCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/category.controller.js';
import { authenticateToken, authorizeRole } from '../utils/jwt.js';

const router = Router();

router.use(authenticateToken);

router.get('/', listCategories);
router.get('/:id', getCategory);

router.post('/', authorizeRole('admin', 'manager'), createCategory);
router.put('/:id', authorizeRole('admin', 'manager'), updateCategory);
router.delete('/:id', authorizeRole('admin'), deleteCategory);

export default router;
