/**
 * Rotas de Configurações do Sistema
 *
 * GET    /api/config        — listar todas (key-value map)
 * GET    /api/config/:key   — buscar por chave
 * PUT    /api/config/:key   — criar ou atualizar (upsert)
 * DELETE /api/config/:key   — excluir
 */

import { Router } from 'express';
import {
  listConfig,
  getConfigKey,
  upsertConfig,
  deleteConfig,
} from '../controllers/config.controller.js';
import { authenticateToken, authorizeRole } from '../utils/jwt.js';

const router = Router();

router.use(authenticateToken);

router.get('/', listConfig);
router.get('/:key', getConfigKey);

router.put('/:key', authorizeRole('admin'), upsertConfig);
router.delete('/:key', authorizeRole('admin'), deleteConfig);

export default router;
