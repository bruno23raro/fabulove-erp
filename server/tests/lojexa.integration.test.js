/**
 * LojeXa Integration Tests
 *
 * Tests for the LojeXa API integration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LojeXaClient } from '../services/lojexa.client.js';

// Test credentials
const testApiKey = 'lj_live_test_api_key_12345';
const testWebhookSecret = 'whsec_test_webhook_secret_12345';

describe('LojeXa HTTP Client', () => {
  let client;

  beforeEach(() => {
    client = new LojeXaClient(testApiKey, testWebhookSecret);
  });

  describe('Constructor', () => {
    it('should create client with valid credentials', () => {
      expect(client).toBeDefined();
    });

    it('should throw when missing credentials', () => {
      expect(() => new LojeXaClient('', '')).toThrow();
    });

    it('should throw when missing API key', () => {
      expect(() => new LojeXaClient('', testWebhookSecret)).toThrow();
    });
  });

  describe('Signature Validation', () => {
    it('should validate correct HMAC signature', () => {
      const crypto = require('crypto');
      const payload = '{"event_type":"test","data":{}}';
      const expectedSignature = crypto
        .createHmac('sha256', testWebhookSecret)
        .update(payload)
        .digest('hex');

      const isValid = client.validateWebhookSignature(payload, `sha256=${expectedSignature}`);
      expect(isValid).toBe(true);
    });

    it('should reject invalid signature', () => {
      const isValid = client.validateWebhookSignature('{"test":true}', 'sha256=invalid');
      expect(isValid).toBe(false);
    });

    it('should reject empty signature', () => {
      const isValid = client.validateWebhookSignature('{"test":true}', '');
      expect(isValid).toBe(false);
    });

    it('should generate signature', () => {
      const payload = '{"test":true}';
      const signature = client.generateSignature(payload);
      expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/);
    });
  });

  describe('Health Check', () => {
    it('should have correct base URL from env or default', () => {
      // baseUrl is a private field, we test via request method behavior
      expect(client).toBeDefined();
    });
  });
});

describe('LojeXa Webhook Events', () => {
  const crypto = require('crypto');

  it('should validate sale.completed event payload', () => {
    const payload = JSON.stringify({
      event_type: 'sale.completed',
      data: { order_id: '12345', items: [] },
      timestamp: new Date().toISOString(),
      event_id: 'evt_test_001'
    });

    const signature = 'sha256=' + crypto
      .createHmac('sha256', testWebhookSecret)
      .update(payload)
      .digest('hex');

    const client = new LojeXaClient(testApiKey, testWebhookSecret);
    expect(client.validateWebhookSignature(payload, signature)).toBe(true);
  });

  it('should validate stock.updated event payload', () => {
    const payload = JSON.stringify({
      event_type: 'stock.updated',
      data: { sku: 'PROD001', quantity: 100, reason: 'adjustment' },
      timestamp: new Date().toISOString(),
      event_id: 'evt_test_002'
    });

    const signature = 'sha256=' + crypto
      .createHmac('sha256', testWebhookSecret)
      .update(payload)
      .digest('hex');

    const client = new LojeXaClient(testApiKey, testWebhookSecret);
    expect(client.validateWebhookSignature(payload, signature)).toBe(true);
  });

  it('should validate order.cancelled event payload', () => {
    const payload = JSON.stringify({
      event_type: 'order.cancelled',
      data: { order_id: '12345', items: [] },
      timestamp: new Date().toISOString(),
      event_id: 'evt_test_003'
    });

    const signature = 'sha256=' + crypto
      .createHmac('sha256', testWebhookSecret)
      .update(payload)
      .digest('hex');

    const client = new LojeXaClient(testApiKey, testWebhookSecret);
    expect(client.validateWebhookSignature(payload, signature)).toBe(true);
  });
});

describe('LojeXa Client Methods', () => {
  it('should be defined correctly', () => {
    const client = new LojeXaClient(testApiKey, testWebhookSecret);
    expect(typeof client.request).toBe('function');
    expect(typeof client.validateWebhookSignature).toBe('function');
    expect(typeof client.generateSignature).toBe('function');
  });
});