import pool from '../config/database.js';

export async function createSupplier(req, res) {
  try {
    const { name, email, phone, document, status, contact_name, address_street, address_city, address_state, address_zip, is_active, notes } = req.body;
    const result = await pool.query(
      `INSERT INTO suppliers (name, email, phone, document, status, contact_name, address_street, address_city, address_state, address_zip, is_active, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [
        name, email || null, phone || null, document || null, status || 'pending',
        contact_name || null, address_street || null, address_city || null,
        address_state || null, address_zip || null,
        is_active !== undefined ? is_active : true, notes || null
      ]
    );
    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (e) {
    return res.status(500).json({ error: 'Erro ao criar fornecedor.', detail: e.message });
  }
}

export async function getSupplier(req, res) {
  try {
    const { rows } = await pool.query('SELECT * FROM suppliers WHERE id = $1', [req.params.id]);
    const supplier = rows[0];
    if (!supplier) return res.status(404).json({ success: false, error: { message: 'Fornecedor não encontrado.' } });
    return res.json({ success: true, data: supplier });
  } catch (e) {
    return res.status(500).json({ error: 'Erro ao buscar fornecedor.', detail: e.message });
  }
}

export async function updateSupplier(req, res) {
  try {
    const { name, email, phone, document, status, contact_name, address_street, address_city, address_state, address_zip, is_active, notes } = req.body;
    await pool.query(
      `UPDATE suppliers SET
         name = COALESCE(NULLIF($1,''), name),
         email = COALESCE(NULLIF($2,''), email),
         phone = COALESCE(NULLIF($3,''), phone),
         document = COALESCE(NULLIF($4,''), document),
         status = COALESCE(NULLIF($5,''), status),
         contact_name = COALESCE(NULLIF($6,''), contact_name),
         address_street = COALESCE(NULLIF($7,''), address_street),
         address_city = COALESCE(NULLIF($8,''), address_city),
         address_state = COALESCE(NULLIF($9,''), address_state),
         address_zip = COALESCE(NULLIF($10,''), address_zip),
         is_active = COALESCE($11, is_active),
         notes = COALESCE($12, notes),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $13 RETURNING *`,
      [name, email, phone, document, status, contact_name, address_street, address_city, address_state, address_zip, is_active, notes, req.params.id]
    );
    const { rows } = await pool.query('SELECT * FROM suppliers WHERE id = $1', [req.params.id]);
    return res.json({ success: true, data: rows[0] });
  } catch (e) {
    return res.status(500).json({ error: 'Erro ao atualizar fornecedor.', detail: e.message });
  }
}

export async function deleteSupplier(req, res) {
  try {
    const { rows } = await pool.query('DELETE FROM suppliers WHERE id = $1 RETURNING id', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ success: false, error: { message: 'Fornecedor não encontrado.' } });
    return res.json({ success: true, data: { message: 'Fornecedor excluído.' } });
  } catch (e) {
    return res.status(500).json({ error: 'Erro ao excluir fornecedor.', detail: e.message });
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
