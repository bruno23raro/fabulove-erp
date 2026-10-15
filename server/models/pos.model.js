/**
 * Model de PDV (Ponto de Venda)
 *
 * Gerencia carrinhos, pré-vendas, vendas concluídas, cancelamentos e estornos.
 * Vendas concluídas também criam registro na tabela orders para integração com relatórios.
 */

import pool from '../config/database.js';
import { ProductModel } from './product.model.js';
import logger from '../utils/logger.js';

export const POS_STATUS = {
  CART:      'cart',
  SAVED:     'saved',
  COMPLETED: 'completed',
  CANCELED:  'canceled',
  REFUNDED:  'refunded',
};

const generateOperationNumber = () => {
  const d = new Date();
  const dateStr = d.getFullYear() +
    String(d.getMonth() + 1).padStart(2, '0') +
    String(d.getDate()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `PDV-${dateStr}-${rand}`;
};

export const PosModel = {
  // ── Busca de produtos (nome, SKU ou barcode) ──────────────────────────────
  async searchProducts(query, limit = 20) {
    const trimmed = (query || '').trim();
    if (!trimmed) return [];

    const { rows } = await pool.query(
      `SELECT p.id, p.name, p.sku, p.barcode, p.price, p.stock, p.stock_min,
              p.is_active, c.name as category_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.is_active = TRUE
         AND (LOWER(p.name) LIKE LOWER($1)
              OR LOWER(COALESCE(p.sku,'')) LIKE LOWER($2)
              OR LOWER(COALESCE(p.barcode,'')) LIKE LOWER($3))
       ORDER BY
         CASE WHEN LOWER(COALESCE(p.barcode,'')) = LOWER($4) THEN 0
              WHEN LOWER(p.sku) = LOWER($5) THEN 1
              ELSE 2 END,
         p.name
       LIMIT $6`,
      [`%${trimmed}%`, `%${trimmed}%`, `%${trimmed}%`, trimmed, trimmed, limit]
    );
    return rows;
  },

  // ── Carrinho / Pré-venda ──────────────────────────────────────────────────
  async createCart(sellerId, customerId = null, isPreSale = false) {
    const operationNumber = generateOperationNumber();
    const { rows } = await pool.query(
      `INSERT INTO pos_sales (operation_number, seller_id, customer_id, status, is_pre_sale)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [operationNumber, sellerId, customerId, POS_STATUS.CART, isPreSale]
    );
    return rows[0];
  },

  async findById(id) {
    const { rows } = await pool.query(
      `SELECT ps.*,
              c.name as customer_name, c.email as customer_email,
              u.name as seller_name
       FROM pos_sales ps
       LEFT JOIN customers c ON c.id = ps.customer_id
       LEFT JOIN users u ON u.id = ps.seller_id
       WHERE ps.id = $1
       LIMIT 1`,
      [id]
    );
    const sale = rows[0];
    if (!sale) return null;

    const { rows: items } = await pool.query(
      `SELECT psi.*, p.name as product_name, p.sku, p.barcode, p.stock as available_stock
       FROM pos_sale_items psi
       LEFT JOIN products p ON p.id = psi.product_id
       WHERE psi.pos_sale_id = $1
       ORDER BY psi.id`,
      [id]
    );
    return { ...sale, items };
  },

  async addItem(saleId, productId, quantity, price = null, barcodeScanned = null) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verifica se o carrinho existe e está em estado válido
      const { rows: saleRows } = await client.query(
        'SELECT id, status FROM pos_sales WHERE id = $1',
        [saleId]
      );
      if (!saleRows[0]) {
        throw new Error('Venda não encontrada');
      }
      if (saleRows[0].status !== POS_STATUS.CART && saleRows[0].status !== POS_STATUS.SAVED) {
        throw new Error('Não é possível adicionar itens a uma venda finalizada');
      }

      // Busca produto
      const product = await ProductModel.findById(productId);
      if (!product) {
        throw new Error(`Produto id=${productId} não encontrado`);
      }
      if (!product.is_active) {
        throw new Error(`Produto "${product.name}" não está ativo`);
      }

      // Para vendas não pré-venda, verifica estoque
      const sale = saleRows[0];
      if (!sale.is_pre_sale) {
        // Soma quantidade já no carrinho + nova quantidade
        const { rows: existingRows } = await client.query(
          'SELECT COALESCE(SUM(quantity), 0) as total FROM pos_sale_items WHERE pos_sale_id = $1 AND product_id = $2',
          [saleId, productId]
        );
        const currentQty = parseInt(existingRows[0]?.total || 0);
        if (product.stock < currentQty + quantity) {
          throw new Error(`Estoque insuficiente para "${product.name}". Disponível: ${product.stock}, necessário: ${currentQty + quantity}`);
        }
      }

      const unitPrice = price !== null ? parseFloat(price) : parseFloat(product.price);
      const subtotal = unitPrice * quantity;

      const { rows: itemRows } = await client.query(
        `INSERT INTO pos_sale_items (pos_sale_id, product_id, quantity, price, subtotal, barcode_scanned)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [saleId, productId, quantity, unitPrice, subtotal, barcodeScanned]
      );
      const item = itemRows[0];

      // Atualiza subtotal, discount e total do carrinho
      await this._recalculate(saleId, client);

      await client.query('COMMIT');
      return item;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async updateItemQuantity(saleId, itemId, quantity) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const sale = await this.findById(saleId);
      if (!sale) throw new Error('Venda não encontrada');
      if (sale.status !== POS_STATUS.CART && sale.status !== POS_STATUS.SAVED) {
        throw new Error('Não é possível alterar itens de uma venda finalizada');
      }

      const item = sale.items?.find(i => i.id === itemId);
      if (!item) throw new Error('Item não encontrado');

      const product = await ProductModel.findById(item.product_id);
      if (!product) throw new Error('Produto não encontrado');

      if (quantity < 1) {
        // Remove o item
        await client.query('DELETE FROM pos_sale_items WHERE id = $1', [itemId]);
      } else {
        if (!sale.is_pre_sale && product.stock < quantity) {
          throw new Error(`Estoque insuficiente para "${product.name}". Disponível: ${product.stock}`);
        }
        await client.query(
          'UPDATE pos_sale_items SET quantity = $1 WHERE id = $2',
          [quantity, itemId]
        );
        await client.query(
          'UPDATE pos_sale_items SET subtotal = (SELECT quantity FROM pos_sale_items WHERE id = $1) * price WHERE id = $1',
          [itemId]
        );
      }

      await this._recalculate(saleId, client);
      await client.query('COMMIT');
      return this.findById(saleId);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async setDiscount(saleId, discount) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const d = Math.max(0, parseFloat(discount) || 0);
      await client.query(
        'UPDATE pos_sales SET discount = $1 WHERE id = $2',
        [d, saleId]
      );
      await this._recalculate(saleId, client);
      await client.query('COMMIT');
      return this.findById(saleId);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async savePreSale(saleId, customerId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `UPDATE pos_sales SET status = $1, customer_id = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
        [POS_STATUS.SAVED, customerId, saleId]
      );
      await client.query('COMMIT');
      return this.findById(saleId);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  // ── Finalização da venda ──────────────────────────────────────────────────
  async completeSale(saleId, paymentMethod, paymentDetails, cashRegisterId, sellerId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const sale = await this.findById(saleId);
      if (!sale) throw new Error('Venda não encontrada');
      if (sale.status !== POS_STATUS.CART && sale.status !== POS_STATUS.SAVED) {
        throw new Error(`Venda já está com status '${sale.status}'`);
      }
      if (!sale.items || sale.items.length === 0) {
        throw new Error('Venda não possui itens');
      }
      if (sale.is_pre_sale) {
        throw new Error('Pré-venda deve ser convertida antes de finalizar');
      }

      // Deduz estoque de cada item
      for (const item of sale.items) {
        const { rowCount } = await client.query(
          `UPDATE products SET stock = stock - $1, updated_at = CURRENT_TIMESTAMP
           WHERE id = $2 AND stock >= $3`,
          [item.quantity, item.product_id, item.quantity]
        );
        if (rowCount === 0) {
          throw new Error(`Estoque insuficiente para "${item.product_name}" (id=${item.product_id})`);
        }
        // Registra movimentação de estoque
        await client.query(
          `INSERT INTO stock_movements (product_id, type, quantity, balance, reference_type, reference_id, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [item.product_id, 'sale', -item.quantity, 0, 'pos_sale', saleId, `PDV ${sale.operation_number}`]
        );
      }

      // Atualiza status da venda
      await client.query(
        `UPDATE pos_sales
         SET status = $1, payment_method = $2, payment_details = $3,
             cash_register_id = $4, completed_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $5`,
        [POS_STATUS.COMPLETED, paymentMethod, JSON.stringify(paymentDetails || {}), cashRegisterId, saleId]
      );

      // Cria pedido correlato na tabela orders para integração com relatórios
      const { rows: orderRows } = await client.query(
        `INSERT INTO orders (order_number, customer_id, status, total, items_count,
                            payment_method, channel, notes, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
         RETURNING id`,
        [
          sale.operation_number,
          sale.customer_id, // anonima → NULL (customer_id foi tornado nullable)
          'delivered', // venda PDV já nasce entregue
          sale.total,
          sale.items.reduce((s, i) => s + i.quantity, 0),
          paymentMethod,
          'pos',
          `PDV — ${sale.notes || ''}`,
        ]
      );
      const orderId = orderRows[0]?.id;

      // Copia itens para order_items
      if (orderId) {
        for (const item of sale.items) {
          await client.query(
            `INSERT INTO order_items (order_id, product_id, quantity, price, subtotal)
             VALUES ($1, $2, $3, $4, $5)`,
            [orderId, item.product_id, item.quantity, item.price, item.subtotal]
          );
        }
      }

      // Registra transação no caixa se houver cash_register_id
      if (cashRegisterId) {
        await client.query(
          `INSERT INTO cash_transactions (register_id, type, amount, reference_type, reference_id, payment_method, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [cashRegisterId, 'sale', sale.total, 'pos_sale', saleId, paymentMethod, `Venda ${sale.operation_number}`]
        );
      }

      await client.query('COMMIT');
      return this.findById(saleId);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  // ── Cancelamento / Reversão ───────────────────────────────────────────────
  async cancelSale(saleId, sellerId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const sale = await this.findById(saleId);
      if (!sale) throw new Error('Venda não encontrada');
      if (sale.status !== POS_STATUS.COMPLETED) {
        throw new Error(`Venda não pode ser cancelada. Status atual: ${sale.status}`);
      }
      if (sale.seller_id !== sellerId && sellerId) {
        // Verifica permissão: apenas o vendedor ou admin/manager podem cancelar
        const { rows: userRows } = await pool.query(
          "SELECT role FROM users WHERE id = $1", [sellerId]
        );
        const role = userRows[0]?.role;
        if (role !== 'admin' && role !== 'manager') {
          throw new Error('Permissão insuficiente para cancelar esta venda');
        }
      }

      // Devolve estoque
      for (const item of sale.items) {
        await client.query(
          `UPDATE products SET stock = stock + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
          [item.quantity, item.product_id]
        );
        await client.query(
          `INSERT INTO stock_movements (product_id, type, quantity, balance, reference_type, reference_id, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [item.product_id, 'return', item.quantity, 0, 'pos_sale', saleId, `Estorno PDV ${sale.operation_number}`]
        );
      }

      await client.query(
        `UPDATE pos_sales SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [POS_STATUS.CANCELED, saleId]
      );

      await client.query('COMMIT');
      return this.findById(saleId);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async refundSale(saleId, sellerId, partialItems = null) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const sale = await this.findById(saleId);
      if (!sale) throw new Error('Venda não encontrada');
      if (sale.status !== POS_STATUS.COMPLETED) {
        throw new Error(`Venda não pode ser estornada. Status atual: ${sale.status}`);
      }

      const itemsToRefund = partialItems && partialItems.length > 0
        ? sale.items.filter(i => partialItems.includes(i.id))
        : sale.items;

      if (itemsToRefund.length === 0) {
        throw new Error('Nenhum item para estornar');
      }

      // Devolve estoque dos itens selecionados
      let refundTotal = 0;
      for (const item of itemsToRefund) {
        await client.query(
          `UPDATE products SET stock = stock + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
          [item.quantity, item.product_id]
        );
        await client.query(
          `INSERT INTO stock_movements (product_id, type, quantity, balance, reference_type, reference_id, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [item.product_id, 'return', item.quantity, 0, 'pos_sale', saleId, `Estorno parcial PDV ${sale.operation_number}`]
        );
        refundTotal += item.subtotal;
      }

      // Prorrateia desconto
      const ratio = sale.total > 0 ? refundTotal / sale.total : 1;
      const adjustedRefund = refundTotal - (sale.discount * ratio);

      await client.query(
        `UPDATE pos_sales SET status = $1, payment_details = jsonb_set(payment_details, '{refund_total}', $2::jsonb), updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
        [POS_STATUS.REFUNDED, adjustedRefund, saleId]
      );

      await client.query('COMMIT');
      return this.findById(saleId);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  // ── Listagem e recuperações ───────────────────────────────────────────────
  async findCart(sellerId) {
    const { rows } = await pool.query(
      `SELECT id, operation_number, status, total, created_at
       FROM pos_sales
       WHERE seller_id = $1 AND status IN ($2, $3)
       ORDER BY created_at DESC LIMIT 5`,
      [sellerId, POS_STATUS.CART, POS_STATUS.SAVED]
    );
    return rows;
  },

  async findSavedSales({ customerId = null, limit = 20, offset = 0 } = {}) {
    let query = `
      SELECT ps.*, c.name as customer_name, u.name as seller_name
      FROM pos_sales ps
      LEFT JOIN customers c ON c.id = ps.customer_id
      LEFT JOIN users u ON u.id = ps.seller_id
      WHERE ps.status = $1
    `;
    const params = [POS_STATUS.SAVED];
    let paramIndex = 2;

    if (customerId) {
      query += ` AND ps.customer_id = $${paramIndex++}`;
      params.push(customerId);
    }

    query += ` ORDER BY ps.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const { rows } = await pool.query(query, params);
    return rows;
  },

  async listSales({ status = null, startDate = null, endDate = null, sellerId = null, limit = 50, offset = 0 } = {}) {
    let query = `
      SELECT ps.*, c.name as customer_name, u.name as seller_name
      FROM pos_sales ps
      LEFT JOIN customers c ON c.id = ps.customer_id
      LEFT JOIN users u ON u.id = ps.seller_id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (status) {
      query += ` AND ps.status = $${paramIndex++}`;
      params.push(status);
    }
    if (startDate) {
      query += ` AND ps.created_at >= $${paramIndex++}`;
      params.push(startDate);
    }
    if (endDate) {
      query += ` AND ps.created_at <= $${paramIndex++}`;
      params.push(endDate);
    }
    if (sellerId) {
      query += ` AND ps.seller_id = $${paramIndex++}`;
      params.push(sellerId);
    }

    query += ` ORDER BY ps.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const { rows } = await pool.query(query, params);
    return rows;
  },

  async getSalesByDateRange(startDate, endDate, sellerId = null) {
    let query = `
      SELECT
        COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
        COUNT(*) FILTER (WHERE status = 'canceled')  as canceled_count,
        COUNT(*) FILTER (WHERE status = 'refunded')  as refunded_count,
        COALESCE(SUM(total) FILTER (WHERE status = 'completed'), 0) as total_revenue,
        COALESCE(SUM(total) FILTER (WHERE status = 'completed' AND payment_method = 'cash'), 0) as cash_total,
        COALESCE(SUM(total) FILTER (WHERE status = 'completed' AND payment_method = 'pix'), 0) as pix_total,
        COALESCE(SUM(total) FILTER (WHERE status = 'completed' AND payment_method = 'credit_card'), 0) as credit_total,
        COALESCE(SUM(total) FILTER (WHERE status = 'completed' AND payment_method = 'debit_card'), 0) as debit_total
      FROM pos_sales
      WHERE created_at >= $1 AND created_at <= $2
    `;
    const params = [startDate, endDate];
    if (sellerId) {
      query += ` AND seller_id = $${params.length + 1}`;
      params.push(sellerId);
    }

    const { rows } = await pool.query(query, params);
    return rows[0];
  },

  // ── Caixa (cash register) ─────────────────────────────────────────────────
  async openCashRegister(operatorId, initialBalance) {
    // Fecha qualquer caixa aberto anteriormente do mesmo operador
    await pool.query(
      `UPDATE cash_registers SET status = 'closed', closed_at = CURRENT_TIMESTAMP,
       closing_balance = expected_balance, notes = 'Fechamento automático (nova abertura)'
       WHERE operator_id = $1 AND status = 'open'`,
      [operatorId]
    );

    const { rows } = await pool.query(
      `INSERT INTO cash_registers (operator_id, opened_at, opening_balance, expected_balance, status)
       VALUES ($1, CURRENT_TIMESTAMP, $2, $2, 'open')
       RETURNING *`,
      [operatorId, parseFloat(initialBalance) || 0]
    );
    return rows[0];
  },

  async closeCashRegister(registerId, finalBalance, sellerId) {
    const { rows: regRows } = await pool.query(
      'SELECT * FROM cash_registers WHERE id = $1 AND status = \'open\'',
      [registerId]
    );
    if (!regRows[0]) throw new Error('Caixa não encontrado ou já fechado');

    const expected = regRows[0].expected_balance;
    const diff = (parseFloat(finalBalance) || 0) - expected;

    await pool.query(
      `UPDATE cash_registers
       SET closed_at = CURRENT_TIMESTAMP, closing_balance = $1, expected_balance = $2,
           status = 'closed', notes = COALESCE(notes, '') || E'\nDiferença: ' || $3 || E'\nFechado por: ' || $4
       WHERE id = $5`,
      [parseFloat(finalBalance) || 0, expected, diff, sellerId, registerId]
    );

    return this.findByIdCashRegister(registerId);
  },

  async findByIdCashRegister(id) {
    const { rows } = await pool.query(
      `SELECT cr.*, u.name as operator_name
       FROM cash_registers cr
       LEFT JOIN users u ON u.id = cr.operator_id
       WHERE cr.id = $1 LIMIT 1`,
      [id]
    );
    const reg = rows[0];
    if (!reg) return null;

    const { rows: transactions } = await pool.query(
      `SELECT ct.*, ps.operation_number
       FROM cash_transactions ct
       LEFT JOIN pos_sales ps ON ps.id = ct.reference_id AND ct.reference_type = 'pos_sale'
       WHERE ct.register_id = $1
       ORDER BY ct.created_at`,
      [id]
    );
    return { ...reg, transactions };
  },

  async listCashRegisters({ limit = 20, offset = 0 } = {}) {
    const { rows } = await pool.query(
      `SELECT cr.*, u.name as operator_name
       FROM cash_registers cr
       LEFT JOIN users u ON u.id = cr.operator_id
       ORDER BY cr.opened_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return rows;
  },

  async getOpenCashRegister() {
    const { rows } = await pool.query(
      `SELECT cr.*, u.name as operator_name
       FROM cash_registers cr
       LEFT JOIN users u ON u.id = cr.operator_id
       WHERE cr.status = 'open'
       ORDER BY cr.opened_at DESC LIMIT 1`,
    );
    return rows[0] || null;
  },

  async addCashEntry(registerId, amount, type, notes) {
    const allowed = ['entry', 'exit'];
    if (!allowed.includes(type)) throw new Error('Tipo inválido. Use entry ou exit');

    const { rows } = await pool.query(
      `INSERT INTO cash_transactions (register_id, type, amount, notes, created_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       RETURNING *`,
      [registerId, type, parseFloat(amount), notes]
    );

    // Atualiza expected_balance do caixa
    await pool.query(
      `UPDATE cash_registers
       SET expected_balance = expected_balance + CASE WHEN $2 = 'entry' THEN $3 ELSE -$3 END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [registerId, type, parseFloat(amount)]
    );

    return rows[0];
  },

  // ── Recalcula totais do carrinho ──────────────────────────────────────────
  async _recalculate(saleId, client = null) {
    const usePool = client || pool;
    const { rows: itemRows } = await usePool.query(
      'SELECT COALESCE(SUM(subtotal), 0) as subtotal FROM pos_sale_items WHERE pos_sale_id = $1',
      [saleId]
    );
    const subtotal = parseFloat(itemRows[0]?.subtotal || 0);
    const { rows: saleRows } = await usePool.query(
      'SELECT discount FROM pos_sales WHERE id = $1',
      [saleId]
    );
    const discount = parseFloat(saleRows[0]?.discount || 0);
    const total = Math.max(0, subtotal - discount);

    await usePool.query(
      `UPDATE pos_sales SET subtotal = $1, total = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
      [subtotal, total, saleId]
    );
  },
};
