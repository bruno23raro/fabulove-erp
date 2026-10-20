import pool from '../config/database.js';

export async function adjustStock(req, res) {
  try {
    const { product_id, quantity, type, notes, reference_type, reference_id } = req.body;
    if (!product_id || !quantity || !type) {
      return res.status(400).json({ success: false, error: { message: 'product_id, quantity e type são obrigatórios.' } });
    }

    const allowed = ['in', 'out', 'adjust'];
    if (!allowed.includes(type)) {
      return res.status(400).json({ success: false, error: { message: 'type deve ser in, out ou adjust.' } });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Calcular novo saldo com base no estoque atual
      const productRes = await client.query('SELECT stock FROM products WHERE id = $1', [product_id]);
      if (productRes.rows.length === 0) {
        throw new Error(`Produto com id ${product_id} não encontrado.`);
      }
      const currentStock = productRes.rows[0].stock;
      let newBalance = currentStock;

      if (type === 'in') {
        newBalance = currentStock + Number(quantity);
        await client.query(`UPDATE products SET stock = $1 WHERE id = $2`, [newBalance, product_id]);
      } else if (type === 'out') {
        if (currentStock < Number(quantity)) {
          throw new Error(`Estoque insuficiente. Disponível: ${currentStock}, solicitado: ${quantity}`);
        }
        newBalance = currentStock - Number(quantity);
        await client.query(`UPDATE products SET stock = $1 WHERE id = $2`, [newBalance, product_id]);
      }
      // 'adjust' não altera o estoque do produto (apenas registra a movimentação)

      const insertQuery = `INSERT INTO stock_movements (product_id, quantity, type, balance, reference_type, reference_id, notes)
                           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`;
      const result = await client.query(insertQuery, [
        product_id,
        quantity,
        type,
        type === 'adjust' ? currentStock : newBalance,
        reference_type || null,
        reference_id || null,
        notes || null
      ]);

      await client.query('COMMIT');
      return res.status(201).json({ success: true, data: result.rows[0], balance: type === 'adjust' ? currentStock : newBalance });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (e) {
    return res.status(500).json({ success: false, error: { message: 'Erro ao ajustar estoque.' } });
  }
}

export async function listMovements(req, res) {
  try {
    const result = await pool.query(
      'SELECT sm.*, p.name as product_name FROM stock_movements sm LEFT JOIN products p ON p.id = sm.product_id ORDER BY sm.created_at DESC LIMIT 100'
    );
    return res.json({ success: true, data: result.rows });
  } catch (e) {
    return res.status(500).json({ success: false, error: { message: 'Erro ao listar movimentações.' } });
  }
}
