import pool from '../config/database.js';

export async function createSupplier(req, res) {
  try {
    const { name, email, phone, document, status } = req.body;
    const result = await pool.query(
      `INSERT INTO suppliers (name, email, phone, document, status) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, email || null, phone || null, document || null, status || 'pending']
    );
    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (e) {
    return res.status(500).json({ error: 'Erro ao criar fornecedor.', detail: e.message });
  }
}

export async function listSuppliers(req, res) {
  try {
    const result = await pool.query('SELECT * FROM suppliers ORDER BY created_at DESC');
    return res.json({ success: true, data: result.rows });
  } catch (e) {
    return res.status(500).json({ error: 'Erro ao listar fornecedores.', detail: e.message });
  }
}
