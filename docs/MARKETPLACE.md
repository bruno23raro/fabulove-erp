# SIZEN ERP — Marketplace Integration Architecture

## Overview

Arquitetura baseada em interface única `MarketplaceAdapter` que permite integrar múltiplos marketplaces
(Mercado Livre, Shopee, agregadoras) sem reescrever o core do sistema.

## Interface `MarketplaceAdapter`

```javascript
{
  authorize(params)       -> Promise<{url: string, state: string}>
  refreshToken(params)    -> Promise<{accessToken, expiresIn, refreshToken?}>
  listProducts(params)    -> Promise<{items, total, page}>
  pushProduct(product)    -> Promise<{remoteId, status}>
  listOrders(params)      -> Promise<{orders, total}>
  updateStock(id, qty)    -> Promise<{success}>
  webhookHandler(payload, signature) -> Promise<{event, data}>
  getStatus()             -> Promise<{connected, lastSync, errors}>
}
```

## Adapters Implementados

### 1. Mock Adapter (`mock`)
- **Uso**: Desenvolvimento, testes, CI/CD
- **Arquivo**: `server/adapters/marketplace.mock.js`
- **Features**: 10 produtos mock, 5 pedidos, fluxo OAuth simulado, stock mutável
- **Status**: ✅ Completo e testado (15 testes)

### 2. Mercado Livre Adapter (`ml`)

- **Uso**: Integração real com Mercado Livre
- **Arquivo**: `server/adapters/ml.adapter.js`
- **Auth**: OAuth 2.0 com `offline_access`, `read`, `write` scopes
- **Endpoints**: `https://api.mercadolibre.com`
- **Referência**: [https://developers.mercadolivre.com.br](https://developers.mercadolivre.com.br)
- **Status**: ✅ Completo — 8 métodos usando `mercadolibre-sdk`
- **Controller**: `server/controllers/ml.controller.js`
- **Rotas**: `server/routes/ml.routes.js`

### 3. Shopee Adapter (`shopee`)
- **Uso**: Integração real com Shopee Open Platform
- **Arquivo**: `server/adapters/shopee.adapter.js`
- **Auth**: Partner App OAuth 2.0 com `shopee-api` SDK
- **Endpoints**: `https://partner.shopeemobile.com`
- **Referência**: https://open.shopee.com
- **Status**: ✅ Completo — 8 métodos + webhook HMAC (11 testes)
