import { Router } from 'express';
import * as supplierController from '../controllers/supplier.controller.js';
import { authenticateToken } from '../utils/jwt.js';

const router = Router();

router.use(authenticateToken);

router.get('/', supplierController.listSuppliers);
router.get('/:id', supplierController.getSupplier);
router.post('/', supplierController.createSupplier);
router.put('/:id', supplierController.updateSupplier);
router.delete('/:id', supplierController.deleteSupplier);

export default router;
