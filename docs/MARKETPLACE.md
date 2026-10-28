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
- **Referência**: https://developers.mercadolivre.com.br
- **Status**: 🟡 Skeleton — métodos retornam placeholders, aguarda credenciais

### 3. Shopee Adapter (`shopee`)
- **Uso**: Integração com Shopee Open Platform
- **Auth**: Partner App OAuth 2.0
- **Status**: ⚠️ Implementação existente em `server/services/shopee.service.js` — precisa migrar para nova interface

## Service de Orquestração

`server/services/marketplace.service.js`:
- `registerAdapter(name, adapter)` — registra adapter
- `getAdapter(name)` — obtém instância
- `listAdapters()` — lista todos com status
- `connect(name, params)` — inicia OAuth
- `handleCallback(name, code, state)` — processa callback
- `disconnect(name)` — desconecta
- `syncProducts(name)` — sincroniza produtos
- `syncStock(name)` — sincroniza estoque
- `pushProduct(name, product)` — envia produto

## Banco de Dados

Tabela `marketplace_accounts` (migration `20261028000001`):
```sql
id, name, provider, access_token, refresh_token, token_expires_at,
config_json, connected_at, last_sync_at, status
```

Tokens armazenados criptografados (TODO: implementar encryption at rest).

## Frontend

Tela em `/marketplaces` (rotas existentes em `MarketplaceView.vue`):
- Status de conexão por loja
- Botão "Conectar" → fluxo OAuth → status conectado/desconectado
- Sincronização manual de produtos/estoque

## Próximos Passos (Bloqueiam em Credenciais)

| Tarefa | Bloqueio | Ação |
|--------|----------|------|
| Mercado Livre real | Criar app em https://developers.mercadolivre.com.br | Preencher ML_CLIENT_ID, ML_CLIENT_SECRET, ML_REDIRECT_URI |
| Shopee real | Criar Partner App em https://open.shopee.com | Preencher SHOPEE_PARTNER_ID, SHOPEE_PARTNER_KEY |
| Encryption at rest | Nenhum | Adicionar `pgcrypto` ou lib nativa para tokens |
| Webhook idempotency | Nenhum | Implementar tabela `marketplace_webhook_events` com `event_id` único |

## Troca por Agregadora

Para usar marketapi.shop ou eCartAPI:
1. Criar `server/adapters/marketapi.adapter.js` implementando a interface
2. Registrar com `registerAdapter('marketapi', new MarketapiAdapter())`
3. Core e frontend permanecem inalterados
