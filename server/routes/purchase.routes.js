import { Router } from 'express';
import * as purchaseController from '../controllers/purchase.controller.js';
import { authenticateToken, authorizeRole } from '../utils/jwt.js';

const router = Router();

router.use(authenticateToken);

router.get('/', purchaseController.listPurchases);
router.get('/:id', purchaseController.getPurchase);
router.post('/', authorizeRole('admin', 'manager', 'operator'), purchaseController.createPurchase);
router.put('/:id', authorizeRole('admin', 'manager'), purchaseController.updatePurchase);
router.delete('/:id', authorizeRole('admin', 'manager'), purchaseController.deletePurchase);

export default router;
