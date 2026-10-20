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

// Legacy single-file import (CSV/ZIP only) — backward compat for E2E tests
router.post('/import', authorizeRole('admin', 'manager'), upload.single('file'), async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: { message: 'Arquivo é obrigatório.' } })
  }
  // Delegate to the universal import service
  const { ImportService } = await import('../services/import/index.js')
  const service = new ImportService({ duplicatePolicy: 'skip' })
  try {
    const result = await service.import(req.file.buffer, req.file.originalname, null, {
      duplicatePolicy: 'skip',
      batchSize: 500,
    })
    if (!result.success) {
      return res.status(400).json({ success: false, error: { message: result.error } })
    }
    return res.json({ success: true, data: {
      created: result.stats.created,
      updated: result.stats.updated,
      errors: result.stats.errors,
      totalLines: result.stats.totalRows,
      errorList: result.errorList?.slice(0, 20) || [],
    }})
  } catch (err) {
    next(err)
  }
})

// Universal import routes (analyze, full import, profiles)
router.use('/import', importController)

export default router;
