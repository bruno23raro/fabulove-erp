/**
 * Dashboard Controller — métricas consolidadas do ERP
 */

import { OrderModel } from '../models/order.model.js';
import { ProductModel } from '../models/product.model.js';
import { CustomerModel } from '../models/customer.model.js';
import pool from '../config/database.js';

// GET /api/dashboard
export const getDashboard = async (req, res, next) => {
  try {
    // Executar todas as queries de métricas em paralelo
    const [orderMetrics, lowStock, recentOrders] = await Promise.all([
      OrderModel.getDashboardMetrics(),
      ProductModel.listLowStock(),
      OrderModel.findAll({ limit: 10, offset: 0 }),
    ]);

    // Métricas de clientes: total e novos no mês
    const { rows: customerRows } = await pool.query(
      `SELECT
        COUNT(*) as total_customers,
        COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE)) as new_this_month
       FROM customers WHERE is_active = TRUE`
    );

    // Receita dos últimos 30 dias
    const { rows: revenueRows } = await pool.query(
      `SELECT
        COALESCE(SUM(total), 0) as revenue_last_30_days,
        COUNT(*) as orders_last_30_days
       FROM orders
       WHERE status = 'delivered' AND created_at >= CURRENT_DATE - INTERVAL '30 days'`
    );

    return res.json({
      success: true,
      data: {
        orders: {
          pending: parseInt(orderMetrics.pending_count) || 0,
          confirmed: parseInt(orderMetrics.confirmed_count) || 0,
          shipped: parseInt(orderMetrics.shipped_count) || 0,
          delivered: parseInt(orderMetrics.delivered_count) || 0,
          canceled: parseInt(orderMetrics.canceled_count) || 0,
          total: parseInt(orderMetrics.total_count) || 0,
          total_revenue: parseFloat(orderMetrics.total_revenue) || 0,
          avg_order_value: parseFloat(orderMetrics.avg_order_value) || 0,
        },
        customers: {
          total: parseInt(customerRows[0]?.total_customers) || 0,
          new_this_month: parseInt(customerRows[0]?.new_this_month) || 0,
          unique_buyers: parseInt(orderMetrics.unique_customers) || 0,
        },
        revenue: {
          last_30_days: parseFloat(revenueRows[0]?.revenue_last_30_days) || 0,
          orders_last_30_days: parseInt(revenueRows[0]?.orders_last_30_days) || 0,
        },
        inventory: {
          low_stock_count: lowStock.length,
          low_stock_products: lowStock.slice(0, 5),
        },
        recent_orders: recentOrders,
      },
    });
  } catch (err) {
    next(err);
  }
};
