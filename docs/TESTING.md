# Testing Guide — SIZEN ERP

## Overview

Test coverage for ERP modules using Vitest + Supertest.

## Run Commands

```bash
npm test                # all tests
npm run test:watch      # watch mode
npm run test:coverage   # coverage report
npm run lint            # eslint
npm run build           # vite build
```

## Coverage Thresholds

- Statements: 23%
- Branches: 25%
- Functions: 20%
- Lines: 23%

## Mock Marketplace Flow (E2E)

Test full workflow without credentials:

```bash
MARKETPLACE_MOCK=true npm test -- server/tests/e2e.mock-flow.test.js
```

**Endpoints:**

- `GET /api/marketplaces/mock/status` — check mock mode
- `POST /api/marketplaces/mock/auth` — connect mock
- `GET /api/marketplaces/mock/products` — list mock products
- `POST /api/marketplaces/mock/orders` — list mock orders
- `POST /api/marketplaces/mock/webhook` — simulate webhook

## Demo Credentials

- Email: `admin@fabulove.com`
- Password: `Admin@12345`

## Test Structure

- `server/tests/` — unit + integration tests
- `server/tests/e2e.mock-flow.test.js` — full mock flow
- `server/tests/marketplace.adapter.test.js` — adapter interface

## CI

GitHub Actions runs `lint → test → build` on push to `main`/`sizren-erp-rebrand`.
