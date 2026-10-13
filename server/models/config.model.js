/**
 * Model de Configurações
 *
 * Armazena preferências e parâmetros do sistema
 */

import pool from '../config/database.js';

export const ConfigModel = {
  // Listar todas as configurações
  async findAll() {
    const { rows } = await pool.query(
      'SELECT key, value, type, description, updated_at FROM config ORDER BY key ASC'
    );
    return rows.reduce((acc, r) => ({ ...acc, [r.key]: r.value }), {});
  },

  // Buscar configuração por chave
  async findByKey(key) {
    const { rows } = await pool.query(
      'SELECT * FROM config WHERE key = $1 LIMIT 1',
      [key]
    );
    return rows[0] || null;
  },

  // Criar ou atualizar configuração
  async upsert({ key, value, type = 'string', description }) {
    const { rows } = await pool.query(
      `INSERT INTO config (key, value, type, description)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (key) DO UPDATE SET
         value = EXCLUDED.value,
         type = EXCLUDED.type,
         description = EXCLUDED.description,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [key, JSON.stringify(value), type, description || null]
    );
    return rows[0];
  },

  // Deletar configuração
  async delete(key) {
    const { rowCount } = await pool.query(
      'DELETE FROM config WHERE key = $1',
      [key]
    );
    return rowCount > 0;
  },

  // Buscar valor como string
  async getString(key, defaultValue = '') {
    const config = await this.findByKey(key);
    return config ? config.value : defaultValue;
  },

  // Buscar valor como número
  async getNumber(key, defaultValue = 0) {
    const config = await this.findByKey(key);
    return config ? parseFloat(config.value) : defaultValue;
  },

  // Buscar valor como booleano
  async getBoolean(key, defaultValue = false) {
    const config = await this.findByKey(key);
    return config ? config.value === 'true' : defaultValue;
  },

  // Buscar valor como JSON
  async getJson(key, defaultValue = {}) {
    const config = await this.findByKey(key);
    return config ? JSON.parse(config.value) : defaultValue;
  }
};
