/**
 * Rotas Financeiras
 *
 * /api/financial/receivable  — contas a receber
 * /api/financial/payable     — contas a pagar
 * /api/financial/cash        — movimentações de caixa
 * /api/financial/summary     — resumo financeiro
 */

import { Router } from 'express';
import { authenticateToken, authorizeRole } from '../utils/jwt.js';
import * as ctrl from '../controllers/financial.controller.js';

const router = Router();

router.use(authenticateToken);
router.use(authorizeRole('admin', 'manager', 'operator'));

// ── Contas a Receber ─────────────────────────────────────────────────────────
router.get('/receivable', ctrl.listAccountsReceivable);
router.get('/receivable/:id', ctrl.getAccountReceivable);
router.post('/receivable/:id/pay', ctrl.payAccountReceivable);
router.post('/receivable/:id/writeoff', ctrl.writeOffAccountReceivable);

// ── Contas a Pagar ───────────────────────────────────────────────────────────
router.get('/payable', ctrl.listAccountsPayable);
router.get('/payable/:id', ctrl.getAccountPayable);
router.post('/payable', ctrl.createAccountPayable);
router.post('/payable/:id/pay', ctrl.payAccountPayable);

// ── Caixa ────────────────────────────────────────────────────────────────────
router.get('/cash', ctrl.listCashTransactions);
router.post('/cash', ctrl.addCashTransaction);

// ── Resumo ───────────────────────────────────────────────────────────────────
router.get('/summary', ctrl.getFinancialSummary);

export default router;
