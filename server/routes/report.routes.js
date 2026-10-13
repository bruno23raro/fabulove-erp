/**
 * Rotas de Relatórios
 *
 * GET /api/reports/sales    — relatório de vendas por período
 * GET /api/reports/stock    — relatório de estoque atual
 * GET /api/reports/status   — status do módulo
 */

import { Router } from 'express';
import { authenticateToken, authorizeRole } from '../utils/jwt.js';
import pool from '../config/database.js';

const router = Router();

router.use(authenticateToken);
router.use(authorizeRole('admin', 'manager'));

// Relatório de vendas por período
router.get('/sales', async (req, res, next) => {
  try {
    const startDate = req.query.start_date || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const endDate = req.query.end_date || new Date().toISOString().slice(0, 10);

    const { rows } = await pool.query(
      `SELECT
        DATE(o.created_at) as date,
        COUNT(*) as orders_count,
        COALESCE(SUM(o.total), 0) as revenue
       FROM orders o
       WHERE o.status IN ('delivered', 'shipped')
         AND o.created_at::date BETWEEN $1 AND $2
       GROUP BY DATE(o.created_at)
       ORDER BY date ASC`,
      [startDate, endDate]
    );

    return res.json({ success: true, data: rows, meta: { start_date: startDate, end_date: endDate } });
  } catch (err) {
    next(err);
  }
});

// Relatório de estoque atual
router.get('/stock', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT
        p.id, p.name, p.sku, p.stock, p.stock_min, p.price, p.cost,
        c.name as category_name,
        (p.stock * p.cost) as stock_value,
        CASE WHEN p.stock <= p.stock_min THEN true ELSE false END as is_low_stock
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.is_active = TRUE
       ORDER BY p.stock ASC`
    );

    const totalValue = rows.reduce((sum, p) => sum + parseFloat(p.stock_value || 0), 0);
    const lowStockCount = rows.filter(p => p.is_low_stock).length;

    return res.json({
      success: true,
      data: rows,
      meta: { total_products: rows.length, total_stock_value: totalValue, low_stock_count: lowStockCount },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
