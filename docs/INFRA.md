# SIZEN ERP — Infrastructure Decisions

## Princípio Central

**Sem Docker. Nunca.** Toda infraestrutura via serviços gerenciados ou binários nativos locais.

## Serviços Externos (Gerenciados)

| Componente | Serviço | Status | Config |
|------------|---------|--------|--------|
| Database | PostgreSQL local (dev) → Supabase (prod) | 🟡 Dev local | `DB_*` vars |
| Email | Resend API | ✅ Configurado | `RESEND_API_KEY` no .env |
| AI | NVIDIA NIM + Agnes AI | ✅ Interface pronta | `NVIDIA_NIM_API_KEY`, `AGNES_AI_API_KEY` |
| Deploy | Vercel (frontend + API) | ✅ Config pronto | `vercel.json` criado |
| CI/CD | GitHub Actions | ✅ Workflow criado | `.github/workflows/ci.yml` |

## Configurações de Ambiente

### Desenvolvimento Local
- PostgreSQL: `localhost:5432`, DB `fabulove_erp`, user `postgres`
- Node.js 20+ nativo
- `.env` com variáveis locais (não commitado)

### Produção (Planejado)
- **Supabase**: PostgreSQL gerenciado, auth, storage, edge functions
- **Vercel**: Deploy automático do branch `main`, preview de PRs
- **Resend**: Email transacional (já configurado com API key)
- **AI**: NVIDIA NIM (gratuito) ou Agnes AI (free tier)

## Variáveis de Ambiente (.env)

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=fabulove_erp
DB_USER=postgres
DB_PASSWORD=***
# Ou DATABASE_URL=postgresql://...

# Auth
JWT_SECRET=*** (32+ chars aleatórios)
JWT_EXPIRES_IN=15m
REFRESH_EXPIRES_IN=7d

# Email (Resend)
RESEND_API_KEY=re_***

# AI
NVIDIA_NIM_API_KEY=***
NVIDIA_NIM_BASE_URL=https://integrate.api.nvidia.com/v1
AGNES_AI_API_KEY=***
AI_PROVIDER=nvidia-nim
AI_MODEL=meta/llama-3.1-8b-instruct

# Client
CLIENT_URL=https://sizen.vercel.app
CORS_ORIGINS=https://sizen.vercel.app
```

## Segurança

- **Helmet**: CSP, HSTS, X-Frame-Options
- **CORS**: Restrito a `CLIENT_URL`
- **Rate Limiting**: Auth (20/15min), API (300/15min)
- **Bcrypt**: 12 rounds
- **Anti-enumeração**: Mensagens genéricas em forgot/reset password
- **Tokens**: Access (15min) + Refresh (7d) com rotação e revogação
- **SQL Injection**: Prepared statements em todas as queries

## Deploy Vercel

`vercel.json` configurado para:
- API serverless: `server/app.js` → `/api/*`
- Frontend estático: `client/dist` → `/*`
- Build automático via `npm run build`

## GitHub Actions CI

`.github/workflows/ci.yml`:
- Trigger: push/PR to `main` e `sizren-erp-rebrand`
- Steps: checkout → node 20 → npm ci → lint → test → build
- Cache: npm dependencies

## Decisões Rejeitadas

| Opção | Motivo da Rejeição |
|-------|-------------------|
| Docker/Compose | Regra: "Sem Docker. Nunca." |
| OpenAI | Removido — apenas NVIDIA NIM + Agnes AI |
| Mercado Pago | Fora do escopo atual |
| Prisma/ORM | SQL nativo é mais transparente e performático |
| Webpack | Vite já configurado e mais rápido |

## Checklist de Produção

- [ ] Supabase project criado + `DATABASE_URL` no Vercel
- [ ] `JWT_SECRET` forte gerado (`openssl rand -hex 32`)
- [ ] `RESEND_API_KEY` válida no Vercel
- [ ] `NVIDIA_NIM_API_KEY` ou `AGNES_AI_API_KEY` no Vercel
- [ ] `CLIENT_URL` e `CORS_ORIGINS` apontando para domínio Vercel
- [ ] Migrations rodadas no Supabase (`npm run db:migrate`)
- [ ] Domain customizado configurado no Vercel
- [ ] Health check `/api/health` monitorado
