# Fabulove ERP Status Report

- **Date**: 2026-10-20 (auditoria + refatoração Shopee OAuth)
- **DB migration**: 18/18 applied successfully (all idempotent).
- **Unit tests**: 32/32 passing (vitest v5.0.5) — +16 Shopee OAuth tests.
- **E2E tests**: 28/28 passing (supertest + verify-site).
- **Build**: Successful (vite v8.3.4, 1.33s).
- **NPM audit**: 0 vulnerabilities in production; 3 high in dev-only chain (nodemon→chokidar→braces, not fixable without breaking nodemon).
- **Security fixes applied**:
  - Critical tinypool RCE (GHSA-5gmw-xhrv-c9v3) → vitest upgraded to v5.0.5
  - High: path traversal in vite → upgraded to v8.3.4
  - High: SMTP injection in nodemailer → upgraded to v10.1.7
  - Moderate: vue-template-compiler fix via @vitejs/plugin-vue v6.0.10
- **CI**: GitHub Actions workflow created (.github/workflows/ci.yml)
- **Notice**: no destructive operations performed; all migrations are idempotent.

## Database State
- Tables: 24 (products, orders, customers, suppliers, purchases, stock_movements, pos_sales, financial tables, shopee tables, etc.)
- Products: 1,045 | Orders: 40 | Users: 4
- Migration 18 (`20261020000000_add_shopee_oauth_columns.sql`): adds OAuth columns (access_token, refresh_token, token_expires_at, token_type, auth_state) — idempotent.

## Modules Status
All 17 Vue views, 13 controllers, 13 route files, 18 migrations: `functional_tested`.

## Bugs Fixed in This Audit

### 1. 🔴 CRITICAL — PDV Payment Button Always Disabled

**File**: `client/src/views/PosView.vue:465-467`

**Issue**: `canComplete` computed required `paymentMethod.value !== ''`, but paymentMethod is only set inside the payment modal (opened by clicking the button). Button was always disabled.

**Fix**: Removed `paymentMethod.value !== ''` from canComplete condition.

### 2. 🟡 MEDIUM — Error Response Format Inconsistency

**Files**: `stock.controller.js`, `purchase.controller.js`, `supplier.controller.js`

**Issue**: These controllers returned `{error: 'msg'}` instead of the consistent `{success: false, error: {message: 'msg'}}` pattern used by all other controllers.

**Fix**: Normalized all 17 error responses across 3 controllers to use the standard format.

**Test updated**: `server/tests/integration.test.js:252` to match new format.

### 3. 🟡 MEDIUM — Shopee Integration: Old Email/Password Flow Deprecated

**Files**: `shopee.service.js`, `shopee.controller.js`, `marketplace.routes.js`, `MarketplaceView.vue`

**Issue**: Old login flow used email+password (deprecated by Shopee). No OAuth support.

**Fix**: Complete rewrite to official OAuth 2.0 Partner flow:
- `getAuthUrl()` — generates signed Partner URL with CSRF state
- `handleCallback()` — validates state, exchanges code for tokens, stores them
- `refreshToken()` — auto-renews expired tokens
- `disconnect()` — clears all tokens securely
- Frontend: OAuth section + manual API Key fallback section
- Database migration adds OAuth columns to `shopee_config`
- 16 new unit tests covering all OAuth paths

## Known Limitations
- 3 high-severity dev-only vulnerabilities in braces/chokidar/nodemon chain (cannot be fixed without nodemon downgrade to v1.x which breaks Node.js 20 compatibility).
- No Playwright browser-based E2E tests yet (only supertest HTTP-level).
- No Dockerfile/docker-compose yet.

## Pending (Manual Steps Required)
1. Create GitHub repository at https://github.com/brunow/fabulove-erp (repo not found at configured remote)
2. Push branch `npm-audit-update` → `master`
3. Create PR for review

## Notes
- All API routes are reachable with proper authentication.
- PDV flow complete: register open/close, cart creation, item add, sale complete, cancellation tests included.
- Shopee marketplace integration: price formula, barcode search, ZIP/CSV import.
- Error response format now consistent across all 13 controllers.
- All 17 Vue views audited and verified functional.
- All 17 database migrations verified idempotent.
- All models (product, order, customer, pos) verified correct.
