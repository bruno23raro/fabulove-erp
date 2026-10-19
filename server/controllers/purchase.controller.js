import pool from '../config/database.js';

export async function createPurchase(req, res) {
  try {
    const { supplier_id, purchase_number, status, items } = req.body;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const insertQuery = `INSERT INTO purchases (supplier_id, number, status)
                           VALUES ($1, $2, $3) RETURNING id`;
      const insertResult = await client.query(insertQuery, [supplier_id, purchase_number || null, status || 'pending']);
      const purchaseId = insertResult.rows[0].id;

      let totalAmount = 0;
      for (const item of items || []) {
        const quantity = Number(item.quantity);
        const cost = Number(item.cost);
        if (!Number.isFinite(quantity) || !Number.isFinite(cost) || quantity <= 0 || cost < 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: `Item inválido: quantidade=${item.quantity}, custo=${item.cost}` });
        }
        const subtotal = cost * quantity;
        totalAmount += subtotal;
        await client.query(
          `INSERT INTO purchase_items (purchase_id, product_id, quantity, unit_price, total_price)
           VALUES ($1, $2, $3, $4, $5)`,
          [purchaseId, item.product_id, quantity, cost, subtotal]
        );
      }

      await client.query(`UPDATE purchases SET total_amount = $1, status = $2, received_at = CURRENT_TIMESTAMP WHERE id = $3`, [totalAmount, 'completed', purchaseId]);

      // Cria conta a pagar automática (não bloqueia a compra se falhar)
      try {
        const { rows: supplierRows } = await client.query('SELECT name FROM suppliers WHERE id = $1', [supplier_id]);
        const supplierName = supplierRows[0]?.name || 'Fornecedor';
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30);
        await client.query(
          `INSERT INTO accounts_payable (supplier_id, purchase_id, description, amount, due_date, status, notes, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
           RETURNING id`,
          [supplier_id, purchaseId, `Compra ${purchase_number || purchaseId} — ${supplierName}`, totalAmount, dueDate.toISOString().slice(0, 10), 'pending', `PDV: auto-criado no recebimento da compra ${purchase_number || purchaseId}`]
        );
      } catch (_) {
        // Conta a pagar opcional — não interrompe a compra
      }

      await client.query('COMMIT');
      return res.status(201).json({ success: true, data: { id: purchaseId, total_amount: totalAmount } });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (e) {
    return res.status(500).json({ error: 'Erro ao criar compra.', detail: e.message });
  }
}

export async function listPurchases(req, res) {
  try {
    const result = await pool.query('SELECT * FROM purchases ORDER BY created_at DESC LIMIT 50');
    return res.json({ success: true, data: result.rows });
  } catch (e) {
    return res.status(500).json({ error: 'Erro ao listar compras.', detail: e.message });
  }
}

export async function getPurchase(req, res) {
  try {
    const { id } = req.params;
    const purchase = await pool.query('SELECT * FROM purchases WHERE id = $1', [id]);
    if (!purchase.rows[0]) return res.status(404).json({ error: 'Compra não encontrada.' });
    const items = await pool.query(
      `SELECT pi.*, p.name as product_name FROM purchase_items pi
       JOIN products p ON p.id = pi.product_id WHERE pi.purchase_id = $1`,
      [id]
    );
    return res.json({ success: true, data: { ...purchase.rows[0], items: items.rows } });
  } catch (e) {
    return res.status(500).json({ error: 'Erro ao buscar compra.', detail: e.message });
  }
}

export async function updatePurchase(req, res) {
  try {
    const { id } = req.params;
    const existing = await pool.query('SELECT * FROM purchases WHERE id = $1', [id]);
    if (!existing.rows[0]) return res.status(404).json({ error: 'Compra não encontrada.' });
    if (['completed', 'cancelled'].includes(existing.rows[0].status)) {
      return res.status(400).json({ error: 'Compra finalizada não pode ser editada.' });
    }
    const { supplier_id, status } = req.body;
    const fields = [];
    const values = [];
    let idx = 1;
    if (supplier_id !== undefined) { fields.push(`supplier_id = $${idx++}`); values.push(supplier_id); }
    if (status !== undefined) { fields.push(`status = $${idx++}`); values.push(status); }
    if (!fields.length) return res.json({ success: true, data: existing.rows[0] });
    fields.push(`updated_at = NOW()`);
    values.push(id);
    await pool.query(`UPDATE purchases SET ${fields.join(', ')} WHERE id = $${idx}`, values);
    const updated = await pool.query('SELECT * FROM purchases WHERE id = $1', [id]);
    return res.json({ success: true, data: updated.rows[0] });
  } catch (e) {
    return res.status(500).json({ error: 'Erro ao atualizar compra.', detail: e.message });
  }
}

export async function deletePurchase(req, res) {
  try {
    const { id } = req.params;
    const existing = await pool.query('SELECT * FROM purchases WHERE id = $1', [id]);
    if (!existing.rows[0]) return res.status(404).json({ error: 'Compra não encontrada.' });
    if (existing.rows[0].status === 'completed') {
      return res.status(400).json({ error: 'Compra concluída não pode ser excluída.' });
    }
    await pool.query('BEGIN');
    try {
      await pool.query('DELETE FROM purchase_items WHERE purchase_id = $1', [id]);
      await pool.query('DELETE FROM purchases WHERE id = $1', [id]);
      await pool.query('COMMIT');
      return res.json({ success: true });
    } catch (e) {
      await pool.query('ROLLBACK');
      throw e;
    }
  } catch (e) {
    return res.status(500).json({ error: 'Erro ao excluir compra.', detail: e.message });
  }
}
