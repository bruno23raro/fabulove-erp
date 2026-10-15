/**
 * Controller de PDV — Ponto de Venda
 *
 * Endpoints:
 *   GET    /api/pos/products/search?q=...      — busca produtos (nome/SKU/barcode)
 *   GET    /api/pos/carts                     — carrinhos abertos do usuário
 *   POST   /api/pos/carts                     — cria novo carrinho
 *   GET    /api/pos/carts/:id                 — detalhes do carrinho
 *   POST   /api/pos/carts/:id/items           — adiciona item
 *   PATCH  /api/pos/carts/:id/items/:itemId   — altera quantidade
 *   DELETE /api/pos/carts/:id/items/:itemId   — remove item
 *   PATCH  /api/pos/carts/:id/discount        — define desconto
 *   PATCH  /api/pos/carts/:id/save            — salva como pré-venda
 *   POST   /api/pos/carts/:id/complete        — finaliza venda
 *   POST   /api/pos/carts/:id/cancel          — cancela venda
 *   POST   /api/pos/carts/:id/refund          — estorna venda
 *   GET    /api/pos/sales                     — histórico de vendas
 *   GET    /api/pos/sales/:id                 — detalhes de uma venda
 *   GET    /api/pos/reports/daily?date=...    — relatório diário
 *
 *   POST   /api/pos/cash/register/open        — abre caixa
 *   POST   /api/pos/cash/register/:id/close   — fecha caixa
 *   GET    /api/pos/cash/register/active      — caixa aberto atual
 *   POST   /api/pos/cash/register/:id/entry   — entrada/saída de dinheiro
 */

import { PosModel, POS_STATUS } from '../models/pos.model.js';
import { authenticateToken, authorizeRole } from '../utils/jwt.js';
import logger from '../utils/logger.js';

// ── Produtos / Busca ──────────────────────────────────────────────────────────

export const searchProducts = async (req, res, next) => {
  try {
    const q = req.query.q || '';
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const products = await PosModel.searchProducts(q, limit);
    return res.json({ success: true, data: products });
  } catch (err) {
    next(err);
  }
};

// ── Carrinhos (carts) ─────────────────────────────────────────────────────────

export const createCart = async (req, res, next) => {
  try {
    const { customerId, isPreSale } = req.body;
    const sellerId = req.user.id;

    if (isPreSale && !customerId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Pré-venda requer identificação do cliente.' },
      });
    }

    const cart = await PosModel.createCart(sellerId, customerId || null, !!isPreSale);
    return res.status(201).json({ success: true, data: cart });
  } catch (err) {
    next(err);
  }
};

export const getCart = async (req, res, next) => {
  try {
    const sale = await PosModel.findById(req.params.id);
    if (!sale) {
      return res.status(404).json({ success: false, error: { message: 'Venda não encontrada.' } });
    }
    return res.json({ success: true, data: sale });
  } catch (err) {
    next(err);
  }
};

export const listCarts = async (req, res, next) => {
  try {
    const carts = await PosModel.findCart(req.user.id);
    return res.json({ success: true, data: carts });
  } catch (err) {
    next(err);
  }
};

export const addItem = async (req, res, next) => {
  try {
    const { productId, quantity, price, barcodeScanned } = req.body;
    if (!productId || !quantity || quantity < 1) {
      return res.status(400).json({
        success: false,
        error: { message: 'productId e quantity (>=1) são obrigatórios.' },
      });
    }

    const item = await PosModel.addItem(req.params.id, productId, parseInt(quantity), price, barcodeScanned);
    const sale = await PosModel.findById(req.params.id);
    return res.json({ success: true, data: sale });
  } catch (err) {
    next(err);
  }
};

export const updateItemQuantity = async (req, res, next) => {
  try {
    const { quantity } = req.body;
    if (quantity === undefined || quantity < 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'quantity deve ser >= 0 (0 remove o item).' },
      });
    }

    const sale = await PosModel.updateItemQuantity(req.params.id, req.params.itemId, parseInt(quantity));
    return res.json({ success: true, data: sale });
  } catch (err) {
    next(err);
  }
};

export const setDiscount = async (req, res, next) => {
  try {
    const { discount } = req.body;
    const sale = await PosModel.setDiscount(req.params.id, discount);
    return res.json({ success: true, data: sale });
  } catch (err) {
    next(err);
  }
};

export const savePreSale = async (req, res, next) => {
  try {
    const { customerId } = req.body;
    if (!customerId) {
      return res.status(400).json({
        success: false,
        error: { message: 'customerId é obrigatório para pré-venda.' }
      });
    }
    const sale = await PosModel.savePreSale(req.params.id, parseInt(customerId));
    return res.json({ success: true, data: sale });
  } catch (err) {
    next(err);
  }
};

export const completeSale = async (req, res, next) => {
  try {
    const { paymentMethod, paymentDetails, cashRegisterId } = req.body;

    if (!paymentMethod) {
      return res.status(400).json({
        success: false,
        error: { message: 'paymentMethod é obrigatório.' }
      });
    }

    const allowedMethods = ['cash', 'pix', 'credit_card', 'debit_card', 'boleto', 'voucher'];
    if (!allowedMethods.includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        error: { message: `Método de pagamento inválido. Aceitos: ${allowedMethods.join(', ')}` }
      });
    }

    const sale = await PosModel.completeSale(
      req.params.id,
      paymentMethod,
      paymentDetails,
      cashRegisterId ? parseInt(cashRegisterId) : null,
      req.user.id
    );
    return res.json({ success: true, data: sale });
  } catch (err) {
    next(err);
  }
};

export const cancelSale = async (req, res, next) => {
  try {
    const sale = await PosModel.cancelSale(req.params.id, req.user.id);
    return res.json({ success: true, data: sale });
  } catch (err) {
    next(err);
  }
};

export const refundSale = async (req, res, next) => {
  try {
    const { partialItems } = req.body;
    const sale = await PosModel.refundSale(req.params.id, req.user.id, partialItems);
    return res.json({ success: true, data: sale });
  } catch (err) {
    next(err);
  }
};

// ── Histórico de vendas ───────────────────────────────────────────────────────

export const listSales = async (req, res, next) => {
  try {
    const { status, start_date, end_date, seller_id, limit = 50, offset = 0 } = req.query;
    const sales = await PosModel.listSales({
      status: status || null,
      startDate: start_date || null,
      endDate: end_date || null,
      sellerId: seller_id ? parseInt(seller_id) : null,
      limit: Math.min(parseInt(limit) || 50, 200),
      offset: parseInt(offset) || 0,
    });
    return res.json({ success: true, data: sales });
  } catch (err) {
    next(err);
  }
};

export const getSale = async (req, res, next) => {
  try {
    const sale = await PosModel.findById(req.params.id);
    if (!sale) {
      return res.status(404).json({ success: false, error: { message: 'Venda não encontrada.' } });
    }
    return res.json({ success: true, data: sale });
  } catch (err) {
    next(err);
  }
};

export const listSavedSales = async (req, res, next) => {
  try {
    const { customer_id, limit = 20, offset = 0 } = req.query;
    const sales = await PosModel.findSavedSales({
      customerId: customer_id ? parseInt(customer_id) : null,
      limit: Math.min(parseInt(limit) || 20, 100),
      offset: parseInt(offset) || 0,
    });
    return res.json({ success: true, data: sales });
  } catch (err) {
    next(err);
  }
};

export const getDailyReport = async (req, res, next) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({
        success: false,
        error: { message: 'Parâmetro date é obrigatório (YYYY-MM-DD).' }
      });
    }
    const start = new Date(date + 'T00:00:00');
    const end = new Date(date + 'T23:59:59');
    const stats = await PosModel.getSalesByDateRange(start, end, req.user.id);
    return res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
};

// ── Caixa (Cash Register) ─────────────────────────────────────────────────────

export const openCashRegister = async (req, res, next) => {
  try {
    const { initialBalance } = req.body;
    const register = await PosModel.openCashRegister(req.user.id, initialBalance);
    return res.status(201).json({ success: true, data: register });
  } catch (err) {
    next(err);
  }
};

export const closeCashRegister = async (req, res, next) => {
  try {
    const { finalBalance } = req.body;
    const register = await PosModel.closeCashRegister(req.params.id, finalBalance, req.user.id);
    return res.json({ success: true, data: register });
  } catch (err) {
    next(err);
  }
};

export const getActiveCashRegister = async (req, res, next) => {
  try {
    const register = await PosModel.getOpenCashRegister();
    return res.json({ success: true, data: register });
  } catch (err) {
    next(err);
  }
};

export const listCashRegisters = async (req, res, next) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const registers = await PosModel.listCashRegisters({
      limit: Math.min(parseInt(limit) || 20, 100),
      offset: parseInt(offset) || 0,
    });
    return res.json({ success: true, data: registers });
  } catch (err) {
    next(err);
  }
};

export const addCashTransaction = async (req, res, next) => {
  try {
    const { amount, type, notes } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'amount deve ser positivo.' }
      });
    }
    if (!['entry', 'exit'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: { message: 'type deve ser entry (reforço) ou exit (sangria).' }
      });
    }
    const transaction = await PosModel.addCashEntry(req.params.id, amount, type, notes);
    return res.status(201).json({ success: true, data: transaction });
  } catch (err) {
    next(err);
  }
};
