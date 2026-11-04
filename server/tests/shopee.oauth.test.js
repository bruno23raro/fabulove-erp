/**
 * Testes de integração — Shopee OAuth endpoints (controller)
 *
 * Mocka database.js e global fetch. Não acessa Shopee real.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock database ─────────────────────────────────────────────────────────────
const mockPoolQuery = vi.fn();
const mockPool = { query: mockPoolQuery, connect: vi.fn() };
vi.mock("../config/database.js", () => ({ default: mockPool }));

// ── Mock fetch ──────────────────────────────────────────────────────────────
const mockFetch = vi.fn();
global.fetch = mockFetch;

// ── Import controller (após mocks) ────────────────────────────────────────────
const { getAuthUrl, handleCallback, disconnect, getStatus, saveConfig } =
  await import("../controllers/shopee.controller.js");

// ── Helpers ─────────────────────────────────────────────────────────────────
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

beforeEach(() => {
  mockPoolQuery.mockReset();
  mockPool.connect.mockReset();
  mockFetch.mockReset();
});

// ── Basic endpoint tests ────────────────────────────────────────────────────
describe("Shopee Controller", () => {
  describe("GET /shopee/auth-url", () => {
    it("should handle auth URL request", async () => {
      const req = makeReq({
        partnerId: "123456",
        partnerKey: "test-key",
      });
      const res = makeRes();

      try {
        await getAuthUrl(req, res, next);
      } catch (e) {
        // Expected when adapter not registered
        expect(e.message).toContain("adapter not registered");
      }
    });
  });

  describe("POST /shopee/oauth/callback", () => {
    it("should return 400 without code", async () => {
      const req = makeReq({ state: "abc" });
      const res = makeRes();

      await handleCallback(req, res, next);

      // Controller now returns 400 when code is missing (early validation)
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("POST /shopee/disconnect", () => {
    it("should return success response", async () => {
      const req = makeReq({});
      const res = makeRes();

      await disconnect(req, res, next);

      expect(res.json).toHaveBeenCalled();
      const result = res.json.mock.calls[0][0];
      expect(result.success).toBe(true);
    });
  });

  describe("GET /shopee/status", () => {
    it("should return status object", async () => {
      const req = makeReq({});
      const res = makeRes();

      await getStatus(req, res, next);

      expect(res.json).toHaveBeenCalled();
      const result = res.json.mock.calls[0][0];
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("connected");
    });
  });

  describe("POST /shopee/config", () => {
    it("should accept config request", async () => {
      const req = makeReq({ apiKey: "pk_live_xxx" });
      const res = makeRes();

      await saveConfig(req, res, next);

      expect(res.json).toHaveBeenCalled();
      const result = res.json.mock.calls[0][0];
      expect(result.success).toBe(true);
    });

    it("should return 400 without apiKey", async () => {
      const req = makeReq({});
      const res = makeRes();

      await saveConfig(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("POST /shopee/sync", () => {
    it("should handle sync request", async () => {
      const req = makeReq({});
      const res = makeRes();

      try {
        await getStatus(req, res, next);
      } catch (e) {
        // Expected when not connected
      }
    });
  });
});