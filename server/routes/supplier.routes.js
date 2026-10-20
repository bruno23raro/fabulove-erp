import { Router } from 'express';
import * as supplierController from '../controllers/supplier.controller.js';
import { authenticateToken, authorizeRole } from '../utils/jwt.js';

const router = Router();

router.use(authenticateToken);

router.get('/', supplierController.listSuppliers);
router.get('/:id', supplierController.getSupplier);
router.post('/', authorizeRole('admin', 'manager'), supplierController.createSupplier);
router.put('/:id', authorizeRole('admin', 'manager'), supplierController.updateSupplier);
router.delete('/:id', authorizeRole('admin'), supplierController.deleteSupplier);

export default router;
