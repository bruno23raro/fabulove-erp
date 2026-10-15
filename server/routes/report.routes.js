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

    // Orders (web/app sales)
    const ordersRows = await pool.query(
      `SELECT
        DATE(o.created_at) as date,
        COUNT(*) as orders_count,
        COALESCE(SUM(o.total), 0) as revenue,
        'order' as source
       FROM orders o
       WHERE o.status IN ('delivered', 'shipped')
         AND o.created_at::date BETWEEN $1 AND $2
       GROUP BY DATE(o.created_at)
       ORDER BY date ASC`,
      [startDate, endDate]
    );

    // PDV sales
    const posRows = await pool.query(
      `SELECT
        DATE(ps.created_at) as date,
        COUNT(*) as orders_count,
        COALESCE(SUM(ps.total), 0) as revenue,
        'pos' as source
       FROM pos_sales ps
       WHERE ps.status = 'completed'
         AND ps.created_at::date BETWEEN $1 AND $2
       GROUP BY DATE(ps.created_at)
       ORDER BY date ASC`,
      [startDate, endDate]
    );

    // Merge by date
    const merged = {};
    for (const r of [...ordersRows.rows, ...posRows.rows]) {
      if (!merged[r.date]) merged[r.date] = { date: r.date, orders_count: 0, revenue: 0, sources: {} };
      merged[r.date].orders_count += parseInt(r.orders_count);
      merged[r.date].revenue = parseFloat(merged[r.date].revenue) + parseFloat(r.revenue);
      merged[r.date].sources[r.source] = true;
    }
    const data = Object.values(merged).sort((a, b) => a.date.localeCompare(b.date));

    // Totais
    const totalOrders = await pool.query(
      `SELECT
        COUNT(*) FILTER (WHERE status IN ('delivered','shipped')) as order_count,
        COALESCE(SUM(total) FILTER (WHERE status IN ('delivered','shipped')), 0) as order_revenue
       FROM orders WHERE created_at::date BETWEEN $1 AND $2`,
      [startDate, endDate]
    );
    const totalPos = await pool.query(
      `SELECT
        COUNT(*) FILTER (WHERE status = 'completed') as pos_count,
        COALESCE(SUM(total) FILTER (WHERE status = 'completed'), 0) as pos_revenue
       FROM pos_sales WHERE created_at::date BETWEEN $1 AND $2`,
      [startDate, endDate]
    );

    return res.json({
      success: true,
      data,
      meta: {
        start_date: startDate,
        end_date: endDate,
        total_orders: parseInt(totalOrders.rows[0]?.order_count || 0),
        total_order_revenue: parseFloat(totalOrders.rows[0]?.order_revenue || 0),
        total_pos: parseInt(totalPos.rows[0]?.pos_count || 0),
        total_pos_revenue: parseFloat(totalPos.rows[0]?.pos_revenue || 0),
        grand_total_revenue: parseFloat(totalOrders.rows[0]?.order_revenue || 0) + parseFloat(totalPos.rows[0]?.pos_revenue || 0),
      },
    });
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
