/**
 * Controller de Financeiro
 *
 * Gerencia contas a receber, contas a pagar e movimentações de caixa.
 */

import pool from '../config/database.js';

// ── Contas a Receber ─────────────────────────────────────────────────────────

export async function listAccountsReceivable(req, res, next) {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    let sql = `
      SELECT ar.*,
             o.order_number,
             c.name as customer_name
      FROM accounts_receivable ar
      LEFT JOIN orders o ON o.id = ar.order_id
      LEFT JOIN customers c ON c.id = o.customer_id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;
    if (status) { sql += ` AND ar.status = $${idx++}`; params.push(status); }
    sql += ` ORDER BY ar.due_date ASC, ar.created_at ASC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(parseInt(limit), parseInt(offset));

    const { rows } = await pool.query(sql, params);

    const { rows: totalRows } = await pool.query(
      `SELECT COUNT(*) as total,
              COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0) as pending_total,
              COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) as paid_total
       FROM accounts_receivable`
    );

    return res.json({ success: true, data: rows, meta: { ...totalRows[0], limit: parseInt(limit), offset: parseInt(offset) } });
  } catch (e) {
    next(e);
  }
}

export async function getAccountReceivable(req, res, next) {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      `SELECT ar.*, o.order_number FROM accounts_receivable ar
       LEFT JOIN orders o ON o.id = ar.order_id WHERE ar.id = $1`,
      [id]
    );
    if (!rows[0]) return res.status(404).json({ success: false, error: { message: 'Conta a receber não encontrada.' } });
    return res.json({ success: true, data: rows[0] });
  } catch (e) {
    next(e);
  }
}

export async function payAccountReceivable(req, res, next) {
  try {
    const { id } = req.params;
    const { amount, payment_method } = req.body;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { rows: existing } = await client.query('SELECT * FROM accounts_receivable WHERE id = $1 FOR UPDATE', [id]);
      if (!existing[0]) { await client.query('ROLLBACK'); return res.status(404).json({ success: false, error: { message: 'Conta não encontrada.' } }); }
      if (existing[0].status === 'paid') { await client.query('ROLLBACK'); return res.status(400).json({ success: false, error: { message: 'Conta já está quitada.' } }); }
      if (existing[0].status === 'written_off') { await client.query('ROLLBACK'); return res.status(400).json({ success: false, error: { message: 'Conta foi dada como baixa.' } }); }

      const paidAmount = parseFloat(amount) || existing[0].amount;
      const newStatus = paidAmount >= existing[0].amount ? 'paid' : 'partial';

      await client.query(
        `UPDATE accounts_receivable
         SET amount = amount - $1::numeric, paid_at = CURRENT_TIMESTAMP, payment_method = COALESCE($2, payment_method),
             status = $3, notes = COALESCE(notes, '') || E'\nQuitado: ' || $1 || (CASE WHEN $3='paid' THEN E'\nQuitada totalmente.' ELSE E'\nParcial.' END)
         WHERE id = $4`,
        [paidAmount, payment_method, newStatus, id]
      );

      await client.query('COMMIT');
      const updated = await client.query('SELECT * FROM accounts_receivable WHERE id = $1', [id]);
      return res.json({ success: true, data: updated.rows[0] });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (e) {
    next(e);
  }
}

export async function writeOffAccountReceivable(req, res, next) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows: existing } = await client.query('SELECT * FROM accounts_receivable WHERE id = $1 FOR UPDATE', [id]);
      if (!existing[0]) { await client.query('ROLLBACK'); return res.status(404).json({ success: false, error: { message: 'Conta não encontrada.' } }); }
      if (existing[0].status === 'paid') { await client.query('ROLLBACK'); return res.status(400).json({ success: false, error: { message: 'Conta quitada não pode ser dada como baixa.' } }); }

      await client.query(
        `UPDATE accounts_receivable SET status = 'written_off', notes = COALESCE(notes, '') || E'\nBaixa: ' || COALESCE($1, 'Sem motivo') WHERE id = $2`,
        [reason, id]
      );
      await client.query('COMMIT');
      const updated = await client.query('SELECT * FROM accounts_receivable WHERE id = $1', [id]);
      return res.json({ success: true, data: updated.rows[0] });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (e) {
    next(e);
  }
}

// ── Contas a Pagar ───────────────────────────────────────────────────────────

export async function listAccountsPayable(req, res, next) {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    let sql = `
      SELECT ap.*, s.name as supplier_name, p.number as purchase_number
      FROM accounts_payable ap
      LEFT JOIN suppliers s ON s.id = ap.supplier_id
      LEFT JOIN purchases p ON p.id = ap.purchase_id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;
    if (status) { sql += ` AND ap.status = $${idx++}`; params.push(status); }
    sql += ` ORDER BY ap.due_date ASC, ap.created_at ASC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(parseInt(limit), parseInt(offset));

    const { rows } = await pool.query(sql, params);

    const { rows: totalRows } = await pool.query(
      `SELECT COUNT(*) as total,
              COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0) as pending_total,
              COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) as paid_total
       FROM accounts_payable`
    );

    return res.json({ success: true, data: rows, meta: { ...totalRows[0], limit: parseInt(limit), offset: parseInt(offset) } });
  } catch (e) {
    next(e);
  }
}

export async function getAccountPayable(req, res, next) {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      `SELECT ap.*, s.name as supplier_name, p.number as purchase_number
       FROM accounts_payable ap
       LEFT JOIN suppliers s ON s.id = ap.supplier_id
       LEFT JOIN purchases p ON p.id = ap.purchase_id
       WHERE ap.id = $1`,
      [id]
    );
    if (!rows[0]) return res.status(404).json({ success: false, error: { message: 'Conta a pagar não encontrada.' } });
    return res.json({ success: true, data: rows[0] });
  } catch (e) {
    next(e);
  }
}

export async function createAccountPayable(req, res, next) {
  try {
    const { supplier_id, purchase_id, description, amount, due_date, payment_method, notes } = req.body;
    const result = await pool.query(
      `INSERT INTO accounts_payable (supplier_id, purchase_id, description, amount, due_date, payment_method, status, notes, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, CURRENT_TIMESTAMP)
       RETURNING *`,
      [supplier_id || null, purchase_id || null, description, amount, due_date, payment_method || null, notes || null]
    );
    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (e) {
    next(e);
  }
}

export async function payAccountPayable(req, res, next) {
  try {
    const { id } = req.params;
    const { amount, payment_method } = req.body;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows: existing } = await client.query('SELECT * FROM accounts_payable WHERE id = $1 FOR UPDATE', [id]);
      if (!existing[0]) { await client.query('ROLLBACK'); return res.status(404).json({ success: false, error: { message: 'Conta não encontrada.' } }); }
      if (existing[0].status === 'paid') { await client.query('ROLLBACK'); return res.status(400).json({ success: false, error: { message: 'Conta já está quitada.' } }); }

      const paidAmount = parseFloat(amount) || existing[0].amount;
      const newStatus = paidAmount >= existing[0].amount ? 'paid' : 'partial';

      await client.query(
        `UPDATE accounts_payable
         SET amount = amount - $1::numeric, paid_at = CURRENT_TIMESTAMP, payment_method = COALESCE($2, payment_method),
             status = $3, notes = COALESCE(notes, '') || E'\nQuitado: ' || $1
         WHERE id = $4`,
        [paidAmount, payment_method, newStatus, id]
      );
      await client.query('COMMIT');
      const updated = await client.query('SELECT * FROM accounts_payable WHERE id = $1', [id]);
      return res.json({ success: true, data: updated.rows[0] });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (e) {
    next(e);
  }
}

// ── Movimentações de Caixa ───────────────────────────────────────────────────

export async function listCashTransactions(req, res, next) {
  try {
    const { register_id, type, limit = 50, offset = 0 } = req.query;
    let sql = `
      SELECT ct.*, cr.operator_id, u.name as operator_name
      FROM cash_transactions ct
      LEFT JOIN cash_registers cr ON cr.id = ct.register_id
      LEFT JOIN users u ON u.id = cr.operator_id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;
    if (register_id) { sql += ` AND ct.register_id = $${idx++}`; params.push(register_id); }
    if (type) { sql += ` AND ct.type = $${idx++}`; params.push(type); }
    sql += ` ORDER BY ct.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(parseInt(limit), parseInt(offset));

    const { rows } = await pool.query(sql, params);
    return res.json({ success: true, data: rows });
  } catch (e) {
    next(e);
  }
}

export async function addCashTransaction(req, res, next) {
  try {
    const { register_id, type, amount, reference_type, reference_id, payment_method, notes } = req.body;
    if (!['sale', 'suprimento', 'sangria', 'entry', 'exit'].includes(type)) {
      return res.status(400).json({ success: false, error: { message: 'Tipo inválido. Use: sale, suprimento, sangria, entry, exit' } });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const reg = await client.query('SELECT id, status FROM cash_registers WHERE id = $1 AND status = \'open\'', [register_id]);
      if (!reg.rows[0]) { await client.query('ROLLBACK'); return res.status(400).json({ success: false, error: { message: 'Caixa não encontrado ou fechado.' } }); }

      const result = await client.query(
        `INSERT INTO cash_transactions (register_id, type, amount, reference_type, reference_id, payment_method, notes, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
         RETURNING *`,
        [register_id, type, parseFloat(amount), reference_type || null, reference_id || null, payment_method || null, notes || null]
      );

      // Atualiza expected_balance do caixa
      const delta = (type === 'sale' || type === 'suprimento' || type === 'entry') ? parseFloat(amount) : -parseFloat(amount);
      await client.query(
        `UPDATE cash_registers SET expected_balance = expected_balance + $1 WHERE id = $2`,
        [delta, register_id]
      );

      await client.query('COMMIT');
      return res.status(201).json({ success: true, data: result.rows[0] });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (e) {
    next(e);
  }
}

// ── Resumo Financeiro ────────────────────────────────────────────────────────

export async function getFinancialSummary(req, res, next) {
  try {
    const [receivables, payables, transactions] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*) as total_count,
          COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0) as pending_total,
          COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) as paid_total,
          COALESCE(SUM(amount) FILTER (WHERE status = 'partial'), 0) as partial_total
        FROM accounts_receivable
      `),
      pool.query(`
        SELECT
          COUNT(*) as total_count,
          COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0) as pending_total,
          COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) as paid_total
        FROM accounts_payable
      `),
      pool.query(`
        SELECT
          COALESCE(SUM(amount) FILTER (WHERE type IN ('sale','suprimento','entry')), 0) as inflows,
          COALESCE(SUM(amount) FILTER (WHERE type IN ('sangria','exit')), 0) as outflows
        FROM cash_transactions
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      `),
    ]);

    return res.json({
      success: true,
      data: {
        accounts_receivable: receivables.rows[0],
        accounts_payable: payables.rows[0],
        cashflow_30d: transactions.rows[0],
        net_position: parseFloat(receivables.rows[0].pending_total) - parseFloat(payables.rows[0].pending_total),
      },
    });
  } catch (e) {
    next(e);
  }
}
