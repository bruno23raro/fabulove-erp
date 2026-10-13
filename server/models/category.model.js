/**
 * Model de Categorias
 *
 * CRUD completo para categorias de produtos
 */

import pool from '../config/database.js';

export const CategoryModel = {
  // Listar todas as categorias
  async findAll() {
    const { rows } = await pool.query(
      'SELECT id, name, description, created_at FROM categories ORDER BY name ASC'
    );
    return rows;
  },

  // Buscar categoria por ID
  async findById(id) {
    const { rows } = await pool.query(
      'SELECT id, name, description, created_at, updated_at FROM categories WHERE id = $1 LIMIT 1',
      [id]
    );
    return rows[0] || null;
  },

  // Buscar categoria por nome
  async findByName(name) {
    const { rows } = await pool.query(
      'SELECT id, name, description, created_at FROM categories WHERE LOWER(name) = LOWER($1) LIMIT 1',
      [name.trim()]
    );
    return rows[0] || null;
  },

  // Criar nova categoria
  async create({ name, description }) {
    const { rows } = await pool.query(
      `INSERT INTO categories (name, description)
       VALUES ($1, $2)
       RETURNING id, name, description, created_at`,
      [name.trim(), description ? description.trim() : null]
    );
    return rows[0];
  },

  // Atualizar categoria
  async update(id, { name, description }) {
    const { rows } = await pool.query(
      `UPDATE categories
       SET name = COALESCE(NULLIF($1, ''), name),
           description = COALESCE(NULLIF($2, ''), description),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING id, name, description, created_at, updated_at`,
      [name ? name.trim() : null, description ? description.trim() : null, id]
    );
    return rows[0] || null;
  },

  // Deletar categoria
  async delete(id) {
    const { rowCount } = await pool.query(
      'DELETE FROM categories WHERE id = $1',
      [id]
    );
    return rowCount > 0;
  },

  // Verificar se categoria tem produtos associados
  async hasProducts(categoryId) {
    const { rows } = await pool.query(
      'SELECT 1 FROM products WHERE category_id = $1 LIMIT 1',
      [categoryId]
    );
    return rows.length > 0;
  }
};
