/**
 * Order Controller — gestão de pedidos com itens e status
 */

import { OrderModel, ORDER_STATUS } from '../models/order.model.js';
import { ProductModel } from '../models/product.model.js';
import logger from '../utils/logger.js';

const VALID_STATUSES = Object.values(ORDER_STATUS);

// GET /api/orders
export const listOrders = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = parseInt(req.query.offset) || 0;
    const status = req.query.status || null;
    const customerId = req.query.customer_id ? parseInt(req.query.customer_id) : null;
    const startDate = req.query.start_date || null;
    const endDate = req.query.end_date || null;

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, error: { message: `Status inválido. Valores aceitos: ${VALID_STATUSES.join(', ')}` } });
    }

    const orders = await OrderModel.findAll({ limit, offset, status, customerId, startDate, endDate });
    return res.json({ success: true, data: orders, meta: { limit, offset } });
  } catch (err) {
    next(err);
  }
};

// GET /api/orders/:id
export const getOrder = async (req, res, next) => {
  try {
    const order = await OrderModel.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, error: { message: 'Pedido não encontrado.' } });
    }

    const items = await OrderModel.getOrderItems(order.id);
    return res.json({ success: true, data: { ...order, items } });
  } catch (err) {
    next(err);
  }
};

// POST /api/orders
export const createOrder = async (req, res, next) => {
  try {
    const { customerId, items, shippingAddress, paymentMethod } = req.body;

    if (!customerId) {
      return res.status(400).json({ success: false, error: { message: 'Cliente é obrigatório.' } });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: { message: 'O pedido deve ter ao menos um item.' } });
    }

    // Validar e enriquecer itens com preço atual do produto
    const enrichedItems = [];
    for (const item of items) {
      if (!item.productId || !item.quantity || item.quantity < 1) {
        return res.status(400).json({ success: false, error: { message: 'Cada item deve ter productId e quantity >= 1.' } });
      }

      const product = await ProductModel.findById(item.productId);
      if (!product) {
        return res.status(404).json({ success: false, error: { message: `Produto id=${item.productId} não encontrado.` } });
      }
      if (!product.is_active) {
        return res.status(400).json({ success: false, error: { message: `Produto "${product.name}" não está ativo.` } });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({ success: false, error: { message: `Estoque insuficiente para "${product.name}". Disponível: ${product.stock}.` } });
      }

      enrichedItems.push({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price || parseFloat(product.price), // aceita override de preço
      });
    }

    const order = await OrderModel.create({ customerId, items: enrichedItems, shippingAddress, paymentMethod });
    const orderItems = await OrderModel.getOrderItems(order.id);

    logger.info(`[Order] Criado id=${order.id} número="${order.order_number}" cliente=${customerId}`);
    return res.status(201).json({ success: true, data: { ...order, items: orderItems } });
  } catch (err) {
    next(err);
  }
};

// PUT /api/orders/:id
export const updateOrder = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await OrderModel.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: { message: 'Pedido não encontrado.' } });
    }

    // Não permite edição de pedidos já cancelados ou entregues
    if ([ORDER_STATUS.CANCELED, ORDER_STATUS.DELIVERED].includes(existing.status)) {
      return res.status(409).json({ success: false, error: { message: `Pedido com status "${existing.status}" não pode ser editado.` } });
    }

    const updated = await OrderModel.update(id, req.body);
    logger.info(`[Order] Atualizado id=${id}`);
    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/orders/:id/status
export const updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, error: { message: `Status inválido. Valores aceitos: ${VALID_STATUSES.join(', ')}` } });
    }

    const existing = await OrderModel.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: { message: 'Pedido não encontrado.' } });
    }

    if (existing.status === ORDER_STATUS.CANCELED) {
      return res.status(409).json({ success: false, error: { message: 'Pedido cancelado não pode ter status alterado.' } });
    }

    const updated = await OrderModel.updateStatus(id, status);
    logger.info(`[Order] Status atualizado id=${id} de="${existing.status}" para="${status}"`);
    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/orders/:id  (só pendentes)
export const deleteOrder = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await OrderModel.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: { message: 'Pedido não encontrado.' } });
    }

    if (existing.status !== ORDER_STATUS.PENDING) {
      return res.status(409).json({ success: false, error: { message: 'Apenas pedidos com status "pending" podem ser excluídos.' } });
    }

    await OrderModel.delete(id);
    logger.info(`[Order] Excluído id=${id}`);
    return res.json({ success: true, data: { message: 'Pedido excluído com sucesso.' } });
  } catch (err) {
    next(err);
  }
};
