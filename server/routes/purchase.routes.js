import { Router } from 'express';
import * as purchaseController from '../controllers/purchase.controller.js';
import { authenticateToken } from '../utils/jwt.js';

const router = Router();

router.use(authenticateToken);

router.get('/', purchaseController.listPurchases);
router.get('/:id', purchaseController.getPurchase);
router.post('/', purchaseController.createPurchase);
router.put('/:id', purchaseController.updatePurchase);
router.delete('/:id', purchaseController.deletePurchase);

export default router;
