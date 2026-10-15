import { Router } from 'express';
import * as supplierController from '../controllers/supplier.controller.js';
import { authenticateToken } from '../utils/jwt.js';

const router = Router();

router.use(authenticateToken);

router.get('/', supplierController.listSuppliers);
router.post('/', supplierController.createSupplier);

export default router;
