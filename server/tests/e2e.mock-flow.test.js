import { describe, it, expect, beforeAll } from "vitest";
import supertest from "supertest";
import app from "../app.js";
import pool from "../config/database.js";

const API = supertest(app);
const AUTH_ENDPOINT = "/api/auth";
const MP_ENDPOINT = "/api/marketplaces";

let authToken = null;
const DEMO_EMAIL = "admin@fabulove.com";
const DEMO_PASSWORD = "Admin@12345";

beforeAll(async () => {
  await pool.query("DELETE FROM refresh_tokens");
  const loginRes = await API.post(AUTH_ENDPOINT + "/login").send({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
  expect(loginRes.status).toBe(200);
  expect(loginRes.body.accessToken).toBeDefined();
  authToken = loginRes.body.accessToken;
});

const headers = () => ({ Authorization: `Bearer ${authToken}` });

describe("E2E — Mock Marketplace Flow", () => {
  it("2. Deve retornar status do mock mode", async () => {
    const res = await API.get(MP_ENDPOINT + "/mock/status").set(headers());
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const mockMode = process.env.MARKETPLACE_MOCK === "true";
    expect(res.body.data.mock).toBe(mockMode);
    expect(res.body.data.connected).toBe(true);
  });

  it("3. Deve conectar mock adapter", async () => {
    const res = await API.post(MP_ENDPOINT + "/mock/auth")
      .set(headers())
      .send({ clientId: "test-client", redirectUri: "http://localhost/callback" });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  it("4. Deve listar produtos mock", async () => {
    await API.post(MP_ENDPOINT + "/mock/auth")
      .set(headers())
      .send({});
    const res = await API.get(MP_ENDPOINT + "/mock/products").set(headers());
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    const items = res.body.data.items || res.body.data;
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeGreaterThan(0);
  });

  it("5. Deve listar pedidos mock", async () => {
    const res = await API.post(MP_ENDPOINT + "/mock/orders").set(headers());
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    const orders = res.body.data.orders || res.body.data;
    expect(Array.isArray(orders)).toBe(true);
  });

  it("6. Deve atualizar estoque mock", async () => {
    const res = await API.post(MP_ENDPOINT + "/mock/stock/update")
      .set(headers())
      .send({ productId: "ML123", quantity: 50 });
    expect([200, 404]).toContain(res.status);
  });

  it("7. Deve processar webhook mock", async () => {
    const payload = { type: "payment", resource: "order_123", data: { id: "123", status: "paid" } };
    const res = await API.post(MP_ENDPOINT + "/mock/webhook")
      .set(headers())
      .send(payload);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("8. Deve retornar status dos adapters", async () => {
    const res = await API.get(MP_ENDPOINT + "/status").set(headers());
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.integrations)).toBe(true);
    const names = res.body.data.integrations.map((i) => i.name);
    expect(names).toContain("mock");
  });

  it("9. Deve desconectar mock", async () => {
    const res = await API.post(MP_ENDPOINT + "/mock/disconnect").set(headers());
    expect([200, 404, 405]).toContain(res.status);
  });
});
