# Integração LojeXa — SIZEN ERP

## ✅ Status: IMPLEMENTADA

Data: 2026-11-03

---

## Resumo

Integração completa com o hub LOJEXA para sincronização de estoque e notificação de vendas. O ERP SIZEN mantém-se como **fonte da verdade do estoque**.

---

## Arquivos Criados/Modificados

### Serviços
- `server/services/lojexa.client.js` — Cliente HTTP com retry, rate limiting, HMAC validation
- `server/services/lojexa.service.js` — Serviço de sincronização e validação

### Controllers
- `server/controllers/webhook.controller.js` — Handler de webhook com assinatura HMAC
- `server/controllers/lojexa.controller.js` — Endpoints de API para sincronização

### Rotas
- `server/routes/webhook.routes.js` — `/api/webhooks/lojexa` (público)
- `server/routes/lojexa.routes.js` — `/api/lojexa/*` (autenticado)

### Banco de Dados
- **NOVO**: Nenhuma migration necessária (usa tabelas existentes)

### Testes
- `server/tests/lojexa.integration.test.js` — 12 testes de integração passando

### Documentação
- `docs/LOJEXA_INTEGRATION.md` — Guia de uso e configuração
- `openapi.json` — Atualizado com endpoints LojeXa

---

## Endpoints Disponíveis

### Webhook (público - sem autenticação)
| Endpoint | Método | Descrição |
|----------|--------|-------------|
| `/api/webhooks/lojexa` | POST | Recebe eventos de LojeXa |
| `/api/webhooks/health` | GET | Verifica saúde do webhook |

### LojeXa API (requer JWT válido)
| Endpoint | Método | Descrição |
|----------|--------|-------------|
| `GET /api/lojexa/status` | - | Status da integração |
| `GET /api/lojexa/validate?sku=XXXX` | - | Valida SKU no ERP |
| `GET /api/lojexa/stock?sku=XXXX` | - | Consulta estoque LojeXa |
| `GET /api/lojexa/divergent` | - | SKUs com estoque divergente |
| `POST /api/lojexa/sync/:productId` | - | Sincroniza estoque (dry-run=true por padrão) |
| `GET /api/lojexa/full-sync` | - | Sincronização completa |

---

## Configuração Necessária

Adicione ao `.env`:

```bash
LOJEXA_API_KEY=lj_live_d6c2155180f31b0d4af2917e60aff127
LOJEXA_WEBHOOK_SECRET=whsec_4a3d34816c2da95aa1c54535f9c4a69f53691f34bc4deeca
LOJEXA_BASE_URL=https://lojexa.com/api/v1
LOJEXA_CALLBACK_URL=https://fabulove-erp.vercel.app/api/webhooks/lojexa
```

---

## Fluxo de Webhook

1. LojeXa envia evento para `POST /api/webhooks/lojexa`
2. ERP valida assinatura HMAC-SHA256
3. ERP responde `200 OK` imediatamente
4. Evento processado em background:
   - `sale.completed` → Log de venda
   - `order.cancelled` → Pode restaurar estoque
   - `stock.updated` → Apenas log (ERP é fonte da verdade)

---

## Eventos Suportados

| Evento | Ação |
|--------|------|
| `sale.completed` | Registra venda no ERP |
| `order.cancelled` | Estorna estoque no ERP |
| `stock.updated` | Log de auditoria (sem ajustar estoque) |
| `order.created` | Informação apenas |

---

## Testes

```bash
npm test -- server/tests/lojexa.integration.test.js
```

12 testes passando:
- Criação do cliente
- Validação de assinatura HMAC
- Geração de assinatura
- Eventos de webhook válidos

---

## Próximos Passos (Opcional)

1. **Webhook URL**: Atualizar `LOJEXA_CALLBACK_URL` para o domínio do seu ambiente
2. **Teste de conexão**: `curl https://seu-erp.com/api/lojexa/status` (com JWT)
3. **Sincronização inicial**: `curl -X POST "https://seu-erp.com/api/lojexa/sync/1?dryRun=false"`
4. **Verificar SKUs divergentes**: `curl "https://seu-erp.com/api/lojexa/divergent"`

---

## Segurança

- ✅ Chave API nunca exposta no frontend
- ✅ Webhook protegido por HMAC-SHA256
- ✅ Dry-run por padrão para prevenção de erros
- ✅ Rate limiting respeitado (60/min)
- ✅ Backoff exponencial em falhas

---

## Documentação Completa

- API Docs: `https://seu-erp.vercel.app/api/docs`
- Integração LojeXa: `docs/LOJEXA_INTEGRATION.md`
- Repositório: https://github.com/brunow/fabulove-erp