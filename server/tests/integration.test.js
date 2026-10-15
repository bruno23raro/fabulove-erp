/**
 * Testes de integração para fornecedores, compras e estoque.
 * Mocka a única dependência real usada pelos controllers: ../config/database.js
 * Não acessam PostgreSQL.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ———————————————————————————————
// Mock unificado do database.js — caminho real que os controllers importam
// ———————————————————————————————
const mockPoolQuery = vi.fn();
const mockClientQuery = vi.fn();

const mockPool = {
  query: mockPoolQuery,
  connect: vi.fn(),
};

vi.mock('../config/database.js', () => ({ default: mockPool }));

const { createSupplier, listSuppliers } = await import('../controllers/supplier.controller.js');
const { createPurchase, listPurchases } = await import('../controllers/purchase.controller.js');
const { adjustStock, listMovements } = await import('../controllers/stock.controller.js');

function makeReq(body = {}) {
  return { body };
}

function makeRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  };
}

/**
 * Configura a sequência de retornos para uma chamada de client.query.
 * order[] = [ {rows:[...]} | {}, null ] por chamada, null = não esperado.
 */
function chainClientQuery(...order) {
  return vi.fn().mockImplementation(() => {
    const next = order.shift();
    if (next === null) throw new Error('client.query called but no mock value configured');
    if (next === 'BEGIN' || next === 'COMMIT' || next === 'ROLLBACK') return Promise.resolve();
    return Promise.resolve(next);
  });
}

/**
 * Configura a sequência de retornos para pool.query (chamadas sem transação).
 */
function chainPoolQuery(...order) {
  return vi.fn().mockImplementation(() => {
    const next = order.shift();
    if (next === null) throw new Error('pool.query called but no mock value configured');
    return Promise.resolve(next);
  });
}

// ———————————————————————————————
// SupplierController
// ———————————————————————————————
describe('SupplierController', () => {
  beforeEach(() => {
    mockPoolQuery.mockReset();
    mockPool.connect.mockReset();
  });

  it('createSupplier deve INSERT com colunas corretas do schema', async () => {
    mockPoolQuery.mockResolvedValue({ rows: [{ id: 1, name: 'Test Supplier' }] });

    const req = makeReq({ name: 'Test Supplier', email: 'test@example.com' });
    const res = makeRes();

    await createSupplier(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: expect.any(Object) }));

    const call = mockPoolQuery.mock.calls[0];
    expect(call[0]).toContain('INSERT INTO suppliers');
    expect(call[0]).toContain('name');
    expect(call[0]).toContain('email');
    expect(call[0]).toContain('phone');
    expect(call[0]).toContain('document');
    expect(call[0]).toContain('status');
  });

  it('listSuppliers deve SELECT * FROM suppliers', async () => {
    mockPoolQuery.mockResolvedValue({ rows: [] });

    const req = makeReq();
    const res = makeRes();

    await listSuppliers(req, res);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: [] }));
    expect(mockPoolQuery.mock.calls[0][0]).toContain('SELECT * FROM suppliers');
  });
});

// ———————————————————————————————
// PurchaseController
// ———————————————————————————————
describe('PurchaseController', () => {
  beforeEach(() => {
    mockPoolQuery.mockReset();
    mockPool.connect.mockReset();
  });

  it('createPurchase deve usar number, total_amount e unit_price/total_price do schema', async () => {
    const clientQuery = chainClientQuery(
      {},                              // BEGIN
      { rows: [{ id: 1 }] },          // INSERT purchases RETURNING id
      {},                              // INSERT purchase_items
      { rows: [] },                   // UPDATE purchases SET total_amount
      {}                               // COMMIT
    );

    mockPool.connect.mockResolvedValue({ query: clientQuery, release: vi.fn() });

    const req = makeReq({
      supplier_id: 1,
      purchase_number: 'PO-001',
      status: 'pending',
      items: [{ product_id: 10, quantity: 2, cost: 50 }],
    });
    const res = makeRes();

    await createPurchase(req, res);

    expect(res.status).toHaveBeenCalledWith(201);

    // call[1] = INSERT purchases
    const insertPurchaseCall = clientQuery.mock.calls[1];
    expect(insertPurchaseCall[0]).toContain('number');
    expect(insertPurchaseCall[0]).toContain('supplier_id');
    // Confirma que NÃO usa colunas inexistentes
    expect(insertPurchaseCall[0]).not.toContain('purchase_number');

    // call[3] = UPDATE purchases SET total_amount
    const updateCall = clientQuery.mock.calls[3];
    expect(updateCall[0]).toContain('UPDATE purchases SET total_amount =');

    // call[2] = INSERT purchase_items
    const insertItemCall = clientQuery.mock.calls[2];
    expect(insertItemCall[0]).toContain('unit_price');
    expect(insertItemCall[0]).toContain('total_price');
    expect(insertItemCall[0]).not.toContain('cost');
    expect(insertItemCall[0]).not.toContain('subtotal');
  });

  it('createPurchase deve calcular subtotal corretamente', async () => {
    const clientQuery = chainClientQuery(
      {},                              // BEGIN
      { rows: [{ id: 1 }] },          // INSERT purchases
      {},                              // INSERT purchase_items
      { rows: [] },                   // UPDATE purchases
      {}                               // COMMIT
    );

    mockPool.connect.mockResolvedValue({ query: clientQuery, release: vi.fn() });

    const req = makeReq({
      supplier_id: 1,
      items: [{ product_id: 5, quantity: 3, cost: 10 }],
    });
    const res = makeRes();

    await createPurchase(req, res);

    // call[2] = INSERT purchase_items com parâmetros [purchaseId, productId, qty, unit_price, total_price]
    const itemInsert = clientQuery.mock.calls[2];
    expect(itemInsert[1]).toEqual([1, 5, 3, 10, 30]);
  });
});

// ———————————————————————————————
// StockController
// ———————————————————————————————
describe('StockController', () => {
  beforeEach(() => {
    mockPoolQuery.mockReset();
    mockPool.connect.mockReset();
  });

  it('adjustStock deve usar balance e notes do schema', async () => {
    const clientQuery = chainClientQuery(
      {},                                  // BEGIN
      { rows: [{ stock: 100 }] },         // SELECT stock
      {},                                  // UPDATE products SET stock
      { rows: [{ id: 1 }] },              // INSERT stock_movements RETURNING id
      {}                                   // COMMIT
    );

    mockPool.connect.mockResolvedValue({ query: clientQuery, release: vi.fn() });

    const req = makeReq({
      product_id: 1,
      quantity: 10,
      type: 'in',
      notes: 'Recebido de fornecedor',
      reference_type: 'purchase',
      reference_id: 5,
    });
    const res = makeRes();

    await adjustStock(req, res);

    expect(res.status).toHaveBeenCalledWith(201);

    // call[3] = INSERT stock_movements
    const insertCall = clientQuery.mock.calls[3];
    expect(insertCall[0]).toContain('balance');
    expect(insertCall[0]).toContain('notes');
    expect(insertCall[0]).toContain('reference_type');
    expect(insertCall[0]).toContain('reference_id');

    // Balance deve ser 100 + 10 = 110 (índice 3 no array de params)
    expect(insertCall[1][3]).toBe(110);
  });

  it('adjustStock out deve validar estoque suficiente', async () => {
    const clientQuery = chainClientQuery(
      { rows: [{ stock: 5 }] },    // SELECT stock (apenas 5)
      null                          // Tentativa de INSERT (deveria falhar antes do INSERT)
    );

    mockPool.connect.mockResolvedValue({ query: clientQuery, release: vi.fn() });

    const req = makeReq({
      product_id: 1,
      quantity: 10,
      type: 'out',
    });
    const res = makeRes();

    await adjustStock(req, res);

    // Deve retornar erro 500 com mensagem de estoque insuficiente
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('adjustStock com type inválido deve retornar 400', async () => {
    const req = makeReq({ product_id: 1, quantity: 5, type: 'invalid' });
    const res = makeRes();

    await adjustStock(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('type deve ser') }));
  });
});
