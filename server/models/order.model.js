/**
 * Model de Pedidos
 *
 * CRUD completo com itens, totais e controle de estoque
 *
 * BUGS CORRIGIDOS (2026-10-13):
 * 1. findAll(): paramIndex não reindexava corretamente para LIMIT/OFFSET — corrigido
 *    com array de conditions e paramIndex controlado rigorosamente.
 * 2. updateStatus(): cancelamento de pedido agora DEVOLVE o estoque em transação.
 *    Proteção contra duplo cancelamento (guard: status !== 'canceled' antes de restaurar).
 */

import pool from '../config/database.js';

export const ORDER_STATUS = {
  PENDING:    'pending',
  CONFIRMED:  'confirmed',
  PROCESSING: 'processing',
  SHIPPED:    'shipped',
  DELIVERED:  'delivered',
  CANCELED:   'canceled',
  REFUNDED:   'refunded',
};

export const OrderModel = {
  // Listar todos os pedidos com filtros opcionais
  async findAll({ limit = 50, offset = 0, status = null, customerId = null, startDate = null, endDate = null } = {}) {
    let query = `
      SELECT o.id, o.order_number, o.customer_id,
             c.name as customer_name, c.email as customer_email,
             o.status, o.total, o.items_count, o.shipping_address, o.payment_method,
             o.created_at, o.updated_at
      FROM orders o
      LEFT JOIN customers c ON c.id = o.customer_id
    `;
    const params = [];
    const conditions = [];
    let paramIndex = 1;

    if (status) {
      conditions.push(`o.status = $${paramIndex++}`);
      params.push(status);
    }
    if (customerId) {
      conditions.push(`o.customer_id = $${paramIndex++}`);
      params.push(customerId);
    }
    if (startDate) {
      conditions.push(`o.created_at >= $${paramIndex++}`);
      params.push(startDate);
    }
    if (endDate) {
      conditions.push(`o.created_at <= $${paramIndex++}`);
      params.push(endDate);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    // BUG CORRIGIDO: paramIndex agora aponta corretamente para o próximo slot
    query += ` ORDER BY o.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const { rows } = await pool.query(query, params);
    return rows;
  },

  // Buscar pedido por ID com dados do cliente
  async findById(id) {
    const { rows } = await pool.query(
      `SELECT o.*, c.name as customer_name, c.email as customer_email, c.phone as customer_phone
       FROM orders o
       LEFT JOIN customers c ON c.id = o.customer_id
       WHERE o.id = $1 LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  // Buscar pedido por número
  async findByOrderNumber(orderNumber) {
    const { rows } = await pool.query(
      'SELECT * FROM orders WHERE order_number = $1 LIMIT 1',
      [orderNumber]
    );
    return rows[0] || null;
  },

  // Criar novo pedido em transação (pedido + itens + dedução de estoque atômicos)
  async create({ customerId, items, shippingAddress, paymentMethod, status = ORDER_STATUS.PENDING }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const itemsTotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
      const itemsCount = items.reduce((sum, i) => sum + i.quantity, 0);

      // Número único: timestamp + random hex (UNIQUE constraint no banco garante)
      const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 0xFFFFFF).toString(16).toUpperCase()}`;

      const { rows: orderRows } = await client.query(
        `INSERT INTO orders (customer_id, order_number, status, total, items_count, shipping_address, payment_method)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [customerId, orderNumber, status, itemsTotal, itemsCount,
         shippingAddress ? JSON.stringify(shippingAddress) : null, paymentMethod || null]
      );
      const order = orderRows[0];

      for (const item of items) {
        await client.query(
          `INSERT INTO order_items (order_id, product_id, quantity, price, subtotal)
           VALUES ($1, $2, $3, $4, $5)`,
          [order.id, item.productId, item.quantity, item.price, item.price * item.quantity]
        );

        // Deduzi estoque — falha se insuficiente (stock >= quantity exigido)
        const { rowCount } = await client.query(
          `UPDATE products SET stock = stock - $1, updated_at = CURRENT_TIMESTAMP
           WHERE id = $2 AND stock >= $1`,
          [item.quantity, item.productId]
        );
        if (rowCount === 0) {
          throw new Error(`Estoque insuficiente para produto id=${item.productId}`);
        }
      }

      await client.query('COMMIT');
      return order;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  // Atualizar campos do pedido (não altera itens)
  async update(id, data) {
    const fields = [];
    const params = [];
    let index = 1;

    if (data.customerId !== undefined) { fields.push(`customer_id = $${index++}`); params.push(data.customerId); }
    if (data.status !== undefined)     { fields.push(`status = $${index++}`);      params.push(data.status); }
    if (data.total !== undefined)      { fields.push(`total = $${index++}`);       params.push(parseFloat(data.total)); }
    if (data.itemsCount !== undefined) { fields.push(`items_count = $${index++}`); params.push(data.itemsCount); }
    if (data.shippingAddress !== undefined) {
      fields.push(`shipping_address = $${index++}`);
      params.push(data.shippingAddress ? JSON.stringify(data.shippingAddress) : null);
    }
    if (data.paymentMethod !== undefined) { fields.push(`payment_method = $${index++}`); params.push(data.paymentMethod); }

    if (fields.length === 0) return this.findById(id);

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);

    const { rows } = await pool.query(
      `UPDATE orders SET ${fields.join(', ')} WHERE id = $${index} RETURNING *`,
      params
    );
    return rows[0] || null;
  },

  // Excluir pedido (apenas pendentes — proteção no controller)
  async delete(id) {
    const { rows } = await pool.query(
      `DELETE FROM orders WHERE id = $1 AND status = $2 RETURNING id`,
      [id, ORDER_STATUS.PENDING]
    );
    return rows.length > 0;
  },

  /**
   * Atualizar status do pedido.
   *
   * BUG CORRIGIDO: ao cancelar, restaura o estoque de todos os itens em transação.
   * Proteção: só restaura se o status ANTERIOR não era 'canceled' (evita duplo estorno).
   */
  async updateStatus(id, newStatus) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Busca estado atual para proteção
      const { rows: current } = await client.query(
        'SELECT status FROM orders WHERE id = $1 FOR UPDATE',
        [id]
      );
      if (!current[0]) throw new Error('Pedido não encontrado');

      const prevStatus = current[0].status;

      // Atualiza status
      const { rows } = await client.query(
        `UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
        [newStatus, id]
      );

      // Se está cancelando e o status anterior NÃO era cancelado, devolve estoque
      if (newStatus === ORDER_STATUS.CANCELED && prevStatus !== ORDER_STATUS.CANCELED) {
        const { rows: items } = await client.query(
          'SELECT product_id, quantity FROM order_items WHERE order_id = $1',
          [id]
        );
        for (const item of items) {
          await client.query(
            `UPDATE products SET stock = stock + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
            [item.quantity, item.product_id]
          );
        }
      }

      await client.query('COMMIT');
      return rows[0] || null;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  // Listar itens de um pedido
  async getOrderItems(orderId) {
    const { rows } = await pool.query(
      `SELECT oi.*, p.name as product_name, p.sku, p.image_url
       FROM order_items oi
       LEFT JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = $1
       ORDER BY oi.id`,
      [orderId]
    );
    return rows;
  },

  // Métricas para o dashboard
  async getDashboardMetrics() {
    const { rows } = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'pending')    as pending_count,
         COUNT(*) FILTER (WHERE status = 'confirmed')  as confirmed_count,
         COUNT(*) FILTER (WHERE status = 'shipped')    as shipped_count,
         COUNT(*) FILTER (WHERE status = 'delivered')  as delivered_count,
         COUNT(*) FILTER (WHERE status = 'canceled')   as canceled_count,
         COUNT(*)                                       as total_count,
         COALESCE(SUM(total) FILTER (WHERE status = 'delivered'), 0) as total_revenue,
         COALESCE(AVG(total) FILTER (WHERE status = 'delivered'), 0) as avg_order_value,
         COUNT(DISTINCT customer_id)                   as unique_customers
       FROM orders`
    );
    return rows[0];
  },
};
