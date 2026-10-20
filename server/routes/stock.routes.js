import { Router } from 'express';
import * as stockController from '../controllers/stock.controller.js';
import { authenticateToken, authorizeRole } from '../utils/jwt.js';

const router = Router();

router.use(authenticateToken);

router.get('/movements', stockController.listMovements);
router.post('/adjust', authorizeRole('admin', 'manager', 'operator'), stockController.adjustStock);

export default router;
