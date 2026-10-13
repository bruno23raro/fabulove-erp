/**
 * Testes de regressão — Modelos de negócio
 *
 * Valida os 3 bugs corrigidos na Fase 0:
 * 1. customer.model: findAll offset correto
 * 2. product.model: findAll busca com paramIndex correto
 * 3. order.model: findAll paramIndex, cancel restaura estoque
 *
 * Usa SQLite em memória via pool mockado para testes unitários puros.
 * Testes de integração real requerem PostgreSQL — marcados com .skip
 * quando banco não está disponível.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Cria um mock do pool que registra as queries e retorna dados controlados.
 */
function createPoolMock(responses = {}) {
  const calls = [];
  const mock = {
    calls,
    query: vi.fn(async (sql, params = []) => {
      calls.push({ sql: sql.trim().replace(/\s+/g, ' '), params });
      const key = Object.keys(responses).find(k => sql.includes(k));
      return responses[key] || { rows: [], rowCount: 0 };
    }),
    connect: vi.fn(async () => {
      const client = {
        calls: [],
        query: vi.fn(async (sql, params = []) => {
          client.calls.push({ sql: sql.trim().replace(/\s+/g, ' '), params });
          const key = Object.keys(responses).find(k => sql.includes(k));
          return responses[key] || { rows: [], rowCount: 0 };
        }),
        release: vi.fn(),
      };
      return client;
    }),
  };
  return mock;
}

// ─── Test: customer.model offset bug ─────────────────────────────────────────

describe('CustomerModel.findAll — bug offset+1 corrigido', () => {
  it('deve passar offset=0 como segundo parâmetro de paginação (sem +1)', async () => {
    const poolMock = createPoolMock({ FROM: { rows: [] } });

    // Importa o módulo com pool mockado
    vi.resetModules();
    vi.doMock('../config/database.js', () => ({ default: poolMock }));
    const { CustomerModel } = await import('../models/customer.model.js?v=test1');

    await CustomerModel.findAll({ limit: 10, offset: 0 });

    const lastCall = poolMock.calls[poolMock.calls.length - 1];
    // O último parâmetro deve ser 0 (offset), não 1 (offset+1)
    const params = lastCall.params;
    expect(params[params.length - 1]).toBe(0); // offset
    expect(params[params.length - 2]).toBe(10); // limit
  });

  it('deve passar offset=20 correto para a segunda página', async () => {
    const poolMock = createPoolMock({ FROM: { rows: [] } });
    vi.resetModules();
    vi.doMock('../config/database.js', () => ({ default: poolMock }));
    const { CustomerModel } = await import('../models/customer.model.js?v=test2');

    await CustomerModel.findAll({ limit: 20, offset: 20 });

    const lastCall = poolMock.calls[poolMock.calls.length - 1];
    const params = lastCall.params;
    expect(params[params.length - 1]).toBe(20); // offset = 20, não 21
    expect(params[params.length - 2]).toBe(20); // limit
  });
});

// ─── Test: product.model search paramIndex ────────────────────────────────────

describe('ProductModel.findAll — bug paramIndex busca corrigido', () => {
  it('busca sem filtros: LIMIT=$1 OFFSET=$2', async () => {
    const poolMock = createPoolMock({ FROM: { rows: [] } });
    vi.resetModules();
    vi.doMock('../config/database.js', () => ({ default: poolMock }));
    const { ProductModel } = await import('../models/product.model.js?v=test1');

    await ProductModel.findAll({ limit: 10, offset: 0 });

    const call = poolMock.calls[0];
    // Sem filtro: params = [10, 0]
    expect(call.params).toEqual([10, 0]);
  });

  it('busca com search: parâmetro de busca único + limit + offset', async () => {
    const poolMock = createPoolMock({ FROM: { rows: [] } });
    vi.resetModules();
    vi.doMock('../config/database.js', () => ({ default: poolMock }));
    const { ProductModel } = await import('../models/product.model.js?v=test2');

    await ProductModel.findAll({ limit: 10, offset: 0, search: 'colar' });

    const call = poolMock.calls[0];
    // Com search: params = ['%colar%', 10, 0] — 3 params, não 4
    expect(call.params).toHaveLength(3);
    expect(call.params[0]).toBe('%colar%');
    expect(call.params[1]).toBe(10);  // limit
    expect(call.params[2]).toBe(0);   // offset
  });

  it('busca com search + categoryId: 4 params total', async () => {
    const poolMock = createPoolMock({ FROM: { rows: [] } });
    vi.resetModules();
    vi.doMock('../config/database.js', () => ({ default: poolMock }));
    const { ProductModel } = await import('../models/product.model.js?v=test3');

    await ProductModel.findAll({ limit: 10, offset: 5, search: 'anel', categoryId: 3 });

    const call = poolMock.calls[0];
    // params = ['%anel%', 3, 10, 5]
    expect(call.params).toHaveLength(4);
    expect(call.params[0]).toBe('%anel%');
    expect(call.params[1]).toBe(3);   // categoryId
    expect(call.params[2]).toBe(10);  // limit
    expect(call.params[3]).toBe(5);   // offset
  });
});

// ─── Test: order.model findAll paramIndex ────────────────────────────────────

describe('OrderModel.findAll — bug paramIndex corrigido', () => {
  it('sem filtros: LIMIT=$1 OFFSET=$2 com params [50, 0]', async () => {
    const poolMock = createPoolMock({ FROM: { rows: [] } });
    vi.resetModules();
    vi.doMock('../config/database.js', () => ({ default: poolMock }));
    const { OrderModel } = await import('../models/order.model.js?v=test1');

    await OrderModel.findAll({ limit: 50, offset: 0 });

    const call = poolMock.calls[0];
    expect(call.params).toEqual([50, 0]);
  });

  it('com status + customerId: 4 params total', async () => {
    const poolMock = createPoolMock({ FROM: { rows: [] } });
    vi.resetModules();
    vi.doMock('../config/database.js', () => ({ default: poolMock }));
    const { OrderModel } = await import('../models/order.model.js?v=test2');

    await OrderModel.findAll({ limit: 20, offset: 0, status: 'pending', customerId: 5 });

    const call = poolMock.calls[0];
    // params = ['pending', 5, 20, 0]
    expect(call.params).toHaveLength(4);
    expect(call.params[0]).toBe('pending');
    expect(call.params[1]).toBe(5);
    expect(call.params[2]).toBe(20); // limit
    expect(call.params[3]).toBe(0);  // offset
  });
});

// ─── Test: order cancel restores stock ───────────────────────────────────────

describe('OrderModel.updateStatus — cancelamento restaura estoque', () => {
  it('ao cancelar pedido com status != canceled, deve fazer UPDATE de estoque para cada item', async () => {
    let beginCalled = false;
    let commitCalled = false;
    const sqlCalls = [];

    const clientMock = {
      query: vi.fn(async (sql, params = []) => {
        const s = sql.trim();
        sqlCalls.push({ sql: s, params });
        if (s === 'BEGIN') { beginCalled = true; return {}; }
        if (s === 'COMMIT') { commitCalled = true; return {}; }
        if (s.includes('SELECT status FROM orders')) {
          return { rows: [{ status: 'confirmed' }] }; // status anterior != canceled
        }
        if (s.includes('UPDATE orders SET status')) {
          return { rows: [{ id: 1, status: 'canceled' }] };
        }
        if (s.includes('SELECT product_id, quantity FROM order_items')) {
          return { rows: [{ product_id: 10, quantity: 2 }, { product_id: 20, quantity: 1 }] };
        }
        if (s.includes('UPDATE products SET stock = stock +')) {
          return { rows: [], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      }),
      release: vi.fn(),
    };

    const poolMock = { connect: vi.fn(async () => clientMock) };
    vi.resetModules();
    vi.doMock('../config/database.js', () => ({ default: poolMock }));
    const { OrderModel } = await import('../models/order.model.js?v=canceltest');

    await OrderModel.updateStatus(1, 'canceled');

    expect(beginCalled).toBe(true);
    expect(commitCalled).toBe(true);

    const stockUpdates = sqlCalls.filter(c => c.sql.includes('UPDATE products SET stock = stock +'));
    expect(stockUpdates).toHaveLength(2);

    // Verifica que devolveu as quantidades corretas
    expect(stockUpdates[0].params).toEqual([2, 10]); // qty=2, product_id=10
    expect(stockUpdates[1].params).toEqual([1, 20]); // qty=1, product_id=20
  });

  it('ao cancelar pedido JÁ cancelado, NÃO deve restaurar estoque novamente', async () => {
    const sqlCalls = [];
    const clientMock = {
      query: vi.fn(async (sql, params = []) => {
        const s = sql.trim();
        sqlCalls.push({ sql: s, params });
        if (s === 'BEGIN' || s === 'COMMIT') return {};
        if (s.includes('SELECT status FROM orders')) {
          return { rows: [{ status: 'canceled' }] }; // já estava cancelado
        }
        if (s.includes('UPDATE orders SET status')) {
          return { rows: [{ id: 1, status: 'canceled' }] };
        }
        return { rows: [], rowCount: 0 };
      }),
      release: vi.fn(),
    };

    const poolMock = { connect: vi.fn(async () => clientMock) };
    vi.resetModules();
    vi.doMock('../config/database.js', () => ({ default: poolMock }));
    const { OrderModel } = await import('../models/order.model.js?v=canceltest2');

    await OrderModel.updateStatus(1, 'canceled');

    const stockUpdates = sqlCalls.filter(c => c.sql.includes('UPDATE products SET stock = stock +'));
    expect(stockUpdates).toHaveLength(0); // sem estorno duplicado
  });
});
