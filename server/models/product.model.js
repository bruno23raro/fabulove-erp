/**
 * Model de Produtos
 *
 * CRUD completo com estoque e relações com categorias
 *
 * BUG CORRIGIDO (2026-10-13): findAll() tinha paramIndex++ duplo no bloco de search,
 * causando dois parâmetros idênticos ($1 e $2) mas paramIndex chegava em 3 antes
 * de adicionar categoryId. Corrigido: search usa apenas um parâmetro com LIKE %$N%.
 */

import pool from '../config/database.js';

export const ProductModel = {
  // Listar todos os produtos com categoria
  async findAll({ limit = 50, offset = 0, search = null, categoryId = null } = {}) {
    let query = `
      SELECT p.id, p.name, p.sku, p.description, p.price, p.cost, p.stock, p.stock_min,
             p.is_active, p.image_url, c.name as category_name, c.id as category_id,
             p.created_at, p.updated_at
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
    `;
    const params = [];
    const conditions = [];
    let paramIndex = 1;

    if (search) {
      // Um único parâmetro reutilizado em dois campos via OR
      conditions.push(`(LOWER(p.name) LIKE LOWER($${paramIndex}) OR LOWER(COALESCE(p.sku,'')) LIKE LOWER($${paramIndex}))`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (categoryId) {
      conditions.push(`p.category_id = $${paramIndex++}`);
      params.push(categoryId);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY p.name ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const { rows } = await pool.query(query, params);
    return rows;
  },

  // Buscar produto por ID com categoria
  async findById(id) {
    const { rows } = await pool.query(
      `SELECT p.*, c.name as category_name, c.id as category_id
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.id = $1 LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  // Buscar produto por SKU
  async findBySku(sku) {
    const { rows } = await pool.query(
      'SELECT * FROM products WHERE UPPER(sku) = UPPER($1) LIMIT 1',
      [sku.trim()]
    );
    return rows[0] || null;
  },

  // Criar novo produto
  async create({ name, sku, description, price, cost, stock, stock_min, categoryId, imageUrl, isActive = true }) {
    const { rows } = await pool.query(
      `INSERT INTO products (name, sku, description, price, cost, stock, stock_min, category_id, image_url, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        name.trim(),
        sku ? sku.trim().toUpperCase() : null,
        description ? description.trim() : null,
        parseFloat(price) || 0,
        parseFloat(cost) || 0,
        parseInt(stock) || 0,
        parseInt(stock_min) || 0,
        categoryId ? parseInt(categoryId) : null,
        imageUrl || null,
        isActive,
      ]
    );
    return rows[0];
  },

  // Atualizar produto
  async update(id, data) {
    const fields = [];
    const params = [];
    let index = 1;

    if (data.name !== undefined) { fields.push(`name = $${index++}`); params.push(data.name.trim()); }
    if (data.sku !== undefined) { fields.push(`sku = $${index++}`); params.push(data.sku ? data.sku.trim().toUpperCase() : null); }
    if (data.description !== undefined) { fields.push(`description = $${index++}`); params.push(data.description ? data.description.trim() : null); }
    if (data.price !== undefined) { fields.push(`price = $${index++}`); params.push(parseFloat(data.price) || 0); }
    if (data.cost !== undefined) { fields.push(`cost = $${index++}`); params.push(parseFloat(data.cost) || 0); }
    if (data.stock !== undefined) { fields.push(`stock = $${index++}`); params.push(parseInt(data.stock) || 0); }
    if (data.stock_min !== undefined) { fields.push(`stock_min = $${index++}`); params.push(parseInt(data.stock_min) || 0); }
    if (data.categoryId !== undefined) { fields.push(`category_id = $${index++}`); params.push(data.categoryId ? parseInt(data.categoryId) : null); }
    if (data.imageUrl !== undefined) { fields.push(`image_url = $${index++}`); params.push(data.imageUrl || null); }
    if (data.isActive !== undefined) { fields.push(`is_active = $${index++}`); params.push(data.isActive); }

    if (fields.length === 0) return this.findById(id);

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);

    const { rows } = await pool.query(
      `UPDATE products SET ${fields.join(', ')} WHERE id = $${index} RETURNING *`,
      params
    );
    return rows[0] || null;
  },

  // Deletar produto
  async delete(id) {
    const { rowCount } = await pool.query('DELETE FROM products WHERE id = $1', [id]);
    return rowCount > 0;
  },

  // Ajustar estoque — delta positivo = entrada, negativo = saída
  async adjustStock(productId, quantity) {
    const { rows } = await pool.query(
      `UPDATE products SET stock = stock + $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING stock`,
      [productId, quantity]
    );
    return rows[0];
  },

  // Listar produtos com estoque baixo
  async listLowStock() {
    const { rows } = await pool.query(
      `SELECT id, name, sku, stock, stock_min, is_active
       FROM products
       WHERE stock <= stock_min AND is_active = TRUE
       ORDER BY stock ASC`
    );
    return rows;
  },
};
