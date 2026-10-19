/**
 * Rotas de PDV
 *
 * Produtos:
 *   GET /api/pos/products/search?q=...&limit=20
 *
 * Carrinhos:
 *   GET    /api/pos/carts              — carrinhos abertos do usuário
 *   POST   /api/pos/carts              — cria novo carrinho
 *   GET    /api/pos/carts/:id          — detalhes
 *   POST   /api/pos/carts/:id/items    — adiciona item
 *   PATCH  /api/pos/carts/:id/items/:itemId — altera quantidade
 *   PATCH  /api/pos/carts/:id/discount — define desconto
 *   PATCH  /api/pos/carts/:id/save     — salva como pré-venda
 *   POST   /api/pos/carts/:id/complete — finaliza venda
 *   POST   /api/pos/carts/:id/cancel   — cancela venda
 *   POST   /api/pos/carts/:id/refund   — estorna venda
 *
 * Histórico:
 *   GET /api/pos/sales              — lista vendas
 *   GET /api/pos/sales/:id          — detalhes
 *   GET /api/pos/sales/saved        — pré-vendas salvas
 *   GET /api/pos/reports/daily?date= — relatório diário
 *
 * Caixa:
 *   GET  /api/pos/cash/register/active    — caixa aberto
 *   POST /api/pos/cash/register/open      — abre caixa
 *   POST /api/pos/cash/register/:id/close — fecha caixa
 *   GET  /api/pos/cash/register           — histórico de caixas
 *   POST /api/pos/cash/register/:id/entry — reforço/sangria
 */

import { Router } from 'express';
import * as posController from '../controllers/pos.controller.js';
import { authenticateToken, authorizeRole } from '../utils/jwt.js';

const router = Router();

router.use(authenticateToken);

// ── Busca de produtos ────────────────────────────────────────────────────────
router.get('/products/search', posController.searchProducts);
router.get('/products/by-barcode/:barcode', posController.findProductByBarcode);

// ── Carrinhos ────────────────────────────────────────────────────────────────
router.get('/carts', posController.listCarts);
router.post('/carts', posController.createCart);
router.get('/carts/:id', posController.getCart);

router.post('/carts/:id/items', authorizeRole('admin', 'manager', 'operator'), posController.addItem);
router.patch('/carts/:id/items/:itemId', authorizeRole('admin', 'manager', 'operator'), posController.updateItemQuantity);
router.patch('/carts/:id/discount', authorizeRole('admin', 'manager', 'operator'), posController.setDiscount);
router.patch('/carts/:id/save', authorizeRole('admin', 'manager', 'operator'), posController.savePreSale);

// Finalizar, cancelar, estornar — operator + admin/manager
router.post('/carts/:id/complete', authorizeRole('admin', 'manager', 'operator'), posController.completeSale);
router.post('/carts/:id/cancel', authorizeRole('admin', 'manager'), posController.cancelSale);
router.post('/carts/:id/refund', authorizeRole('admin', 'manager'), posController.refundSale);

// ── Histórico ────────────────────────────────────────────────────────────────
// ATENÇÃO: '/sales/saved' deve vir ANTES de '/sales/:id' — senão Express
// captura "saved" como :id e quebra com erro bigint.
router.get('/sales/saved', posController.listSavedSales);
router.get('/sales', posController.listSales);
router.get('/sales/:id', posController.getSale);
router.get('/reports/daily', posController.getDailyReport);

// ── Caixa ────────────────────────────────────────────────────────────────────
router.get('/cash/register/active', posController.getActiveCashRegister);
router.post('/cash/register/open', authorizeRole('admin', 'manager', 'operator'), posController.openCashRegister);
router.post('/cash/register/:id/close', authorizeRole('admin', 'manager'), posController.closeCashRegister);
router.get('/cash/register', posController.listCashRegisters);
router.post('/cash/register/:id/entry', authorizeRole('admin', 'manager', 'operator'), posController.addCashTransaction);

export default router;
