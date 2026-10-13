/**
 * Model de Clientes
 *
 * CRUD completo com histórico de pedidos
 *
 * BUG CORRIGIDO (2026-10-13): findAll() passava `offset + 1` como parâmetro,
 * fazendo a primeira página pular o registro de índice 0.
 * Corrigido: params.push(limit, offset) — sem +1.
 */

import pool from '../config/database.js';

export const CustomerModel = {
  // Listar todos os clientes
  async findAll({ limit = 50, offset = 0, search = null } = {}) {
    let query = `
      SELECT id, name, email, phone, document, is_active, created_at, updated_at
      FROM customers
    `;
    const params = [];
    let paramIndex = 1;

    if (search) {
      query += ` WHERE (LOWER(name) LIKE LOWER($${paramIndex}) OR LOWER(COALESCE(email,'')) LIKE LOWER($${paramIndex}) OR COALESCE(phone,'') LIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ` ORDER BY name ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset); // BUG CORRIGIDO: era offset + 1

    const { rows } = await pool.query(query, params);
    return rows;
  },

  // Buscar cliente por ID com totais
  async findById(id) {
    const { rows } = await pool.query(
      `SELECT c.*,
              COUNT(o.id) as order_count,
              COALESCE(SUM(o.total), 0) as total_spent
       FROM customers c
       LEFT JOIN orders o ON o.customer_id = c.id
       WHERE c.id = $1
       GROUP BY c.id
       LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  // Buscar cliente por email
  async findByEmail(email) {
    const { rows } = await pool.query(
      'SELECT * FROM customers WHERE LOWER(email) = LOWER($1) LIMIT 1',
      [email.trim()]
    );
    return rows[0] || null;
  },

  // Buscar cliente por documento (CPF/CNPJ — só dígitos)
  async findByDocument(document) {
    const digits = document.replace(/[^\d]/g, '');
    const { rows } = await pool.query(
      'SELECT * FROM customers WHERE document = $1 LIMIT 1',
      [digits]
    );
    return rows[0] || null;
  },

  // Criar novo cliente
  async create({ name, email, phone, document, isActive = true }) {
    const { rows } = await pool.query(
      `INSERT INTO customers (name, email, phone, document, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, phone, document, is_active, created_at`,
      [
        name.trim(),
        email ? email.toLowerCase().trim() : null,
        phone ? phone.trim() : null,
        document ? document.replace(/[^\d]/g, '') : null,
        isActive,
      ]
    );
    return rows[0];
  },

  // Atualizar cliente
  async update(id, data) {
    const fields = [];
    const params = [];
    let index = 1;

    if (data.name !== undefined) { fields.push(`name = $${index++}`); params.push(data.name.trim()); }
    if (data.email !== undefined) { fields.push(`email = $${index++}`); params.push(data.email ? data.email.toLowerCase().trim() : null); }
    if (data.phone !== undefined) { fields.push(`phone = $${index++}`); params.push(data.phone ? data.phone.trim() : null); }
    if (data.document !== undefined) { fields.push(`document = $${index++}`); params.push(data.document ? data.document.replace(/[^\d]/g, '') : null); }
    if (data.isActive !== undefined) { fields.push(`is_active = $${index++}`); params.push(data.isActive); }

    if (fields.length === 0) return this.findById(id);

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);

    const { rows } = await pool.query(
      `UPDATE customers SET ${fields.join(', ')} WHERE id = $${index} RETURNING *`,
      params
    );
    return rows[0] || null;
  },

  // Deletar cliente
  async delete(id) {
    const { rowCount } = await pool.query('DELETE FROM customers WHERE id = $1', [id]);
    return rowCount > 0;
  },

  // Listar pedidos de um cliente
  async getOrders(customerId, { limit = 20, offset = 0 } = {}) {
    const { rows } = await pool.query(
      `SELECT o.*, COUNT(oi.id) as items_count, COALESCE(SUM(oi.quantity * oi.price), 0) as items_total
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       WHERE o.customer_id = $1
       GROUP BY o.id
       ORDER BY o.created_at DESC
       LIMIT $2 OFFSET $3`,
      [customerId, limit, offset]
    );
    return rows;
  },
};
