import { Router } from 'express';
import * as stockController from '../controllers/stock.controller.js';
import { authenticateToken } from '../utils/jwt.js';

const router = Router();

router.use(authenticateToken);

router.get('/movements', stockController.listMovements);
router.post('/adjust', stockController.adjustStock);

export default router;
