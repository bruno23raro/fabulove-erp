/**
 * Testes de integração — Shopee OAuth endpoints (controller)
 *
 * Mocka database.js e global fetch. Não acessa Shopee real.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock database ─────────────────────────────────────────────────────────────
const mockPoolQuery = vi.fn();
const mockPool = { query: mockPoolQuery, connect: vi.fn() };
vi.mock('../config/database.js', () => ({ default: mockPool }));

// ── Mock fetch ────────────────────────────────────────────────────────────────
const mockFetch = vi.fn();
global.fetch = mockFetch;

// ── Mock crypto.sign (para signUrl/signRequest) ───────────────────────────────
// O serviço usa node:crypto interna, não mockamos — testes focam no controller

// ── Import controller (após mocks) ────────────────────────────────────────────
const {
  getAuthUrl,
  handleCallback,
  disconnect,
  getStatus,
  saveConfig,
} = await import('../controllers/shopee.controller.js');

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeReq(body = {}) {
  return { body, query: {} };
}

function makeRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
    setHeader: vi.fn().mockReturnThis(),
    send: vi.fn(),
  };
}

function next(err) {
  if (err) throw err;
}

function chainPoolQuery(...order) {
  return vi.fn().mockImplementation(() => {
    const next = order.shift();
    if (next === null) throw new Error('pool.query called unexpectedly');
    return Promise.resolve(next);
  });
}

beforeEach(() => {
  mockPoolQuery.mockReset();
  mockPool.connect.mockReset();
  mockFetch.mockReset();
});

// ── getAuthUrl ────────────────────────────────────────────────────────────────
describe('GET /shopee/auth-url', () => {
  it('deve gerar URL de autorização com dados válidos', async () => {
    // getConfig retorna null (sem config)
    mockPoolQuery.mockImplementation(async (sql) => {
      if (sql.includes('ORDER BY id DESC LIMIT 1')) {
        return { rows: [] };
      }
      // INSERT na shopee_config
      return { rows: [] };
    });

    const req = makeReq({
      partnerId: '123456',
      partnerKey: 'secret-key-abc',
      shopId: '789',
      locale: 'pt_BR',
      callbackUrl: 'http://localhost:3000/api/marketplaces/shopee/oauth/callback',
    });
    const res = makeRes();

    await getAuthUrl(req, res, next);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalled();
    const result = res.json.mock.calls[0][0];
    expect(result.success).toBe(true);
    expect(result.data.authUrl).toContain('partner.shopeemobile.com');
    expect(result.data.authUrl).toContain('partner_id=123456');
    expect(result.data.authUrl).toContain('locale=pt_BR');
    expect(result.data.authUrl).toContain('redirect_uri=');
  });

  it('deve rejeitar quando partnerId e partnerKey ausentes', async () => {
    mockPoolQuery.mockImplementation(async (sql) => {
      if (sql.includes('ORDER BY id DESC LIMIT 1')) return { rows: [] };
      return { rows: [] };
    });

    // Sem partnerId e partnerKey no body → serviço lança erro
    const req = makeReq({});
    const res = makeRes();

    await expect(getAuthUrl(req, res, next)).rejects.toThrow('Partner ID e Partner Key não configurados');
  });

  it('deve propagar erro do serviço via next() quando params inválidos', async () => {
    mockPoolQuery.mockImplementation(async (sql) => {
      if (sql.includes('ORDER BY id DESC LIMIT 1')) return { rows: [] };
      return { rows: [] };
    });

    // partnerId vazio, partnerKey vazio — mesmo erro
    const req = makeReq({ partnerId: '', partnerKey: '' });
    const res = makeRes();

    await expect(getAuthUrl(req, res, next)).rejects.toThrow('Partner ID e Partner Key não configurados');
  });
});

// ── handleCallback ────────────────────────────────────────────────────────────
describe('POST /shopee/oauth/callback', () => {
  it('deve retornar 400 sem code', async () => {
    const req = makeReq({ state: 'abc' });
    const res = makeRes();

    await handleCallback(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      error: expect.objectContaining({ message: expect.stringContaining('Authorization code') }),
    }));
  });

  it('deve trocar code por token e salvar no banco', async () => {
    const configRow = {
      id: 1, partner_id: '123456', api_secret: 'secret', auth_state: 'valid-state',
    };
    mockPoolQuery.mockImplementation(async (sql) => {
      if (sql.includes('ORDER BY id DESC LIMIT 1')) {
        return { rows: [configRow] };
      }
      // INSERT/UPDATE shopee_config
      return { rows: [] };
    });

    // Mock fetch para o exchange de token
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          access_token: 'NEW_ACCESS_TOKEN',
          refresh_token: 'NEW_REFRESH_TOKEN',
          expires_in: 86400,
          token_type: 'Bearer',
          shop_id: '789',
        },
      }),
      text: async () => '',
    });

    const req = makeReq({
      code: 'AUTH_CODE_xyz',
      state: 'valid-state',
      partnerKey: 'secret',
    });
    const res = makeRes();

    await handleCallback(req, res, next);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalled();
    const result = res.json.mock.calls[0][0];
    expect(result.success).toBe(true);
    expect(result.data.token).toBe('NEW_ACCESS_TOKEN');
    expect(result.data.shopId).toBe('789');
  });

  it('deve rejeitar state inválido (CSRF)', async () => {
    const configRow = {
      id: 1, partner_id: '123', api_secret: 'secret', auth_state: 'stored-state',
    };
    mockPoolQuery.mockImplementation(async (sql) => {
      if (sql.includes('ORDER BY id DESC LIMIT 1')) {
        return { rows: [configRow] };
      }
      return { rows: [] };
    });

    const req = makeReq({ code: 'xyz', state: 'wrong-state' });
    const res = makeRes();

    await expect(handleCallback(req, res, next)).rejects.toThrow('Estado de segurança');
  });

  it('deve rejeitar código expirado pela Shopee', async () => {
    const configRow = {
      id: 1, partner_id: '123', api_secret: 'secret', auth_state: 'valid-state',
    };
    mockPoolQuery.mockImplementation(async (sql) => {
      if (sql.includes('ORDER BY id DESC LIMIT 1')) {
        return { rows: [configRow] };
      }
      return { rows: [] };
    });

    // Shopee responde com erro de código expirado
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        error: true,
        status: 1,
        message: 'Authorization code has expired',
      }),
      text: async () => '',
    });

    const req = makeReq({ code: 'expired_code', state: 'valid-state' });
    const res = makeRes();

    await expect(handleCallback(req, res, next)).rejects.toThrow(/expirado|invalido/i);
  });
});

// ── disconnect ────────────────────────────────────────────────────────────────
describe('POST /shopee/disconnect', () => {
  it('deve limpar tokens e credenciais', async () => {
    let callCount = 0;
    mockPoolQuery.mockImplementation(async (sql) => {
      callCount++;
      if (sql.includes('ORDER BY id DESC LIMIT 1')) {
        return { rows: [{ id: 1, access_token: 'tok', refresh_token: 'ref', partner_id: '123' }] };
      }
      // UPDATE shopee_config SET ... WHERE id = 1
      return { rows: [] };
    });

    const req = makeReq({});
    const res = makeRes();

    await disconnect(req, res, next);

    expect(res.json).toHaveBeenCalled();
    const result = res.json.mock.calls[0][0];
    expect(result.success).toBe(true);
    expect(result.data.message).toContain('desconectada');
  });

  it('deve lidar com configurações ausentes', async () => {
    mockPoolQuery.mockImplementation(async (sql) => {
      if (sql.includes('ORDER BY id DESC LIMIT 1')) {
        return { rows: [] };
      }
      return { rows: [] };
    });

    const req = makeReq({});
    const res = makeRes();

    await disconnect(req, res, next);

    expect(res.json).toHaveBeenCalled();
    expect(res.json.mock.calls[0][0].success).toBe(true);
  });
});

// ── getStatus ─────────────────────────────────────────────────────────────────
describe('GET /shopee/status', () => {
  it('deve retornar configured=false quando sem dados', async () => {
    mockPoolQuery.mockResolvedValue({ rows: [] });

    const req = makeReq({});
    const res = makeRes();

    await getStatus(req, res, next);

    expect(res.json).toHaveBeenCalled();
    const result = res.json.mock.calls[0][0];
    expect(result.success).toBe(true);
    expect(result.data.configured).toBe(false);
    expect(result.data.hasToken).toBe(false);
  });

  it('deve retornar status completo com token OAuth válido', async () => {
    const future = new Date(Date.now() + 3600_000).toISOString();
    mockPoolQuery.mockResolvedValue({
      rows: [{
        id: 1,
        api_key: '123',
        api_secret: 'secret',
        access_token: 'bearer_tok',
        refresh_token: 'refresh_tok',
        token_expires_at: future,
        token_type: 'Bearer',
        partner_id: '123',
        shop_id: '789',
        sync_enabled: true,
        last_sync_at: '2026-10-20T10:00:00Z',
        last_sync_status: 'ok',
      }],
    });

    const req = makeReq({});
    const res = makeRes();

    await getStatus(req, res, next);

    const result = res.json.mock.calls[0][0];
    expect(result.success).toBe(true);
    expect(result.data.configured).toBe(true);
    expect(result.data.hasToken).toBe(true);
    expect(result.data.authMethod).toBe('oauth');
    expect(result.data.partnerIdShort).toBe('123...');
    expect(result.data.syncEnabled).toBe(true);
  });

  it('deve marcar hasToken=false quando token expirado', async () => {
    const past = new Date(Date.now() - 86400_000).toISOString();
    mockPoolQuery.mockResolvedValue({
      rows: [{
        id: 1,
        access_token: 'old_token',
        refresh_token: null,
        token_expires_at: past,
        partner_id: '123',
        sync_enabled: false,
      }],
    });

    const req = makeReq({});
    const res = makeRes();

    await getStatus(req, res, next);

    const result = res.json.mock.calls[0][0];
    expect(result.data.hasToken).toBe(false);
  });

  it('deve identificar authMethod=api_key quando sem access_token', async () => {
    mockPoolQuery.mockResolvedValue({
      rows: [{
        id: 1,
        api_key: 'pk_live_xxx',
        api_secret: 'secret',
        access_token: null,
        partner_id: null,
        sync_enabled: true,
      }],
    });

    const req = makeReq({});
    const res = makeRes();

    await getStatus(req, res, next);

    const result = res.json.mock.calls[0][0];
    expect(result.data.authMethod).toBe('api_key');
    expect(result.data.hasToken).toBe(false);
  });
});

// ── saveConfig (API Key mode) ─────────────────────────────────────────────────
describe('POST /shopee/config', () => {
  it('deve salvar API Key e Secret', async () => {
    mockPoolQuery.mockImplementation(async (sql) => {
      if (sql.includes('ORDER BY id DESC LIMIT 1')) {
        return { rows: [] };
      }
      return { rows: [] };
    });

    const req = makeReq({
      apiKey: 'pk_live_xxx',
      apiSecret: 'sk_live_xxx',
      shopId: '789',
      syncEnabled: true,
    });
    const res = makeRes();

    await saveConfig(req, res, next);

    expect(res.json).toHaveBeenCalled();
    expect(res.json.mock.calls[0][0].success).toBe(true);
  });

  it('deve retornar 400 sem apiKey', async () => {
    const req = makeReq({ apiSecret: 'sk_live_xxx' });
    const res = makeRes();

    await saveConfig(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      error: expect.objectContaining({ message: expect.stringContaining('apiKey') }),
    }));
  });

  it('deve retornar 400 sem apiSecret', async () => {
    const req = makeReq({ apiKey: 'pk_live_xxx' });
    const res = makeRes();

    await saveConfig(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      error: expect.objectContaining({ message: expect.stringContaining('apiSecret') }),
    }));
  });
});
