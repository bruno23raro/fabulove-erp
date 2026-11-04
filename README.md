# SIZEN ERP — AI Seller Agent Platform

ERP completo para automação de e-commerce com integração de IA, gestão de produtos, pedidos, estoque, financeiro e marketplaces.

**Status:** ~87% concluído | **Testes:** 144/144 passing | **Build:** ✅

---

## 🚀 Funcionalidades

### Módulos Principais

- **Dashboard** — KPIs, gráficos Chart.js, métricas consolidadas
- **Produtos** — CRUD completo, busca, barcode, preço Shopee automático
- **Categorias** — Gestão de catálogo
- **Clientes** — Cadastro com CPF/CNPJ, histórico de pedidos
- **Pedidos** — CRUD, status flow, sincronização automática de estoque
- **PDV** — Ponto de venda, carrinho, finalização múltipla, caixa, barcode scanner
- **Estoque** — Movimentações, ajustes, auditoria completa
- **Fornecedores** — Cadastro completo com documento
- **Compras** — Ordens de compra, recebimento, auto-criação de contas a pagar
- **Financeiro** — Contas a pagar/receber, cashflow, movimentações de caixa
- **Relatórios** — Vendas e estoque por período
- **Marketplaces** — Shopee OAuth 2.0, Mercado Livre, TikTok Shop (adapters)
- **Importador Universal** — CSV, XLSX, JSON, XML, ZIP com wizard UI
- **CRM** — Leads, deals, activities
- **IA** — Multi-provider (Groq, OpenRouter, NVIDIA NIM, Agnes AI)

### Integrações

- **Shopee** — OAuth 2.0 Partner flow, sync de produtos, export CSV
- **Mercado Livre** — Adapter completo com mercadolibre-sdk
- **TikTok Shop** — Adapter esqueleto (expandível)
- **IA** — OCR NF-e, SEO titles, descriptions, price suggestions

---

## 🛠️ Tecnologias

| Camada   | Tecnologia                              | Versão   |
| -------- | --------------------------------------- | -------- |
| Runtime  | Node.js                                 | v24.21.0 |
| Backend  | Express                                 | ^4.18.2  |
| Frontend | Vue 3                                   | ^3.3.11  |
| Build    | Vite                                    | ^8.3.5   |
| Estado   | Pinia                                   | ^2.1.7   |
| Banco    | PostgreSQL                              | —        |
| ORM      | pg (node-postgres)                      | ^8.11.3  |
| Testes   | Vitest                                  | ^5.0.5   |
| E2E      | Playwright                              | ^1.64.1  |
| Auth     | JWT + bcryptjs                          | —        |
| Logs     | Winston                                 | ^3.19.0  |
| Email    | Resend/Nodemailer                       | —        |
| Import   | papaparse, xlsx, jszip, fast-xml-parser | —        |

---

## 📦 Instalação

### Pré-requisitos

- Node.js >= 20
- npm >= 10
- PostgreSQL >= 14

### Passos

```bash
# 1. Clonar repositório
git clone git@github.com:brunow/fabulove-erp.git
cd fabulove-erp

# 2. Instalar dependências
npm install

# 3. Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas credenciais (veja abaixo)

# 4. Executar migrações
npm run db:migrate

# 5. Popular dados de teste
npm run db:seed

# 6. Iniciar desenvolvimento
npm run dev
```

### Credenciais de Teste

- **Email:** `admin@fabulove.com`
- **Senha:** `Admin@12345`

---

## ⚙️ Variáveis de Ambiente (.env)

```bash
# Banco
DB_HOST=localhost
DB_PORT=5432
DB_NAME=fabulove_erp
DB_USER=postgres
DB_PASSWORD=seu_password_aqui

# JWT
JWT_SECRET=seu_secret_seguro_128_chars_minimo
JWT_EXPIRES_IN=15m
REFRESH_EXPIRES_IN=7d

# Frontend URL
CLIENT_URL=http://localhost:5173

# Emails (Resend recomendado)
RESEND_API_KEY=re_sua_key_aqui

# IA Providers (pelo menos um)
GROQ_API_KEY=gsk_...
OPENROUTER_API_KEY=sk-or-v1-...
NVIDIA_NIM_API_KEY=...
AGNES_AI_API_KEY=...

# Marketplaces (opcional)
SHOPEE_PARTNER_ID=
SHOPEE_PARTNER_KEY=
ML_CLIENT_ID=
ML_CLIENT_SECRET=

# Mock mode (para testes sem credenciais)
MARKETPLACE_MOCK=true
```

---

## 🧪 Testes

```bash
# Unitários + Integração (Vitest)
npm test

# Com coverage
npm run test:coverage

# Watch mode
npm run test:watch

# E2E Browser (Playwright)
npx playwright test
npx playwright test --headed

# Build
npm run build

# Lint
npm run lint
npm run lint:fix

# Format
npm run format
```

---

## 🐳 Docker

```bash
# Iniciar stack completa
docker compose up -d

# Parar
docker compose down

# Dev com hot reload
docker compose -f docker-compose.dev.yml up -d
```

---

## 📊 Arquitetura

```
┌─────────────────────────────────────────────────────┐
│                    CLIENT (Vue 3)                    │
│  Components: 14 reutilizáveis                         │
│  Views: 20 (11 refactorizadas)                       │
│  Router: 15 rotas + auth guards                      │
└─────────────────────────┬───────────────────────────┘
                          │ HTTP/Axios
┌─────────────────────────▼───────────────────────────┐
│                   SERVER (Express)                    │
│  Controllers: 16                                    │
│  Routes: 18                                          │
│  Services: 12                                        │
│  Adapters: 4 (mock, ML, Shopee, TikTok)             │
│  Middleware: security, rate-limit, error handler     │
└─────────────────────────┬───────────────────────────┘
                          │ PostgreSQL
┌─────────────────────────▼───────────────────────────┐
│                  DATABASE (PostgreSQL)                │
│  27+ tabelas | 23 migrations | ~1,045 produtos       │
└─────────────────────────────────────────────────────┘
```

---

## 📁 Estrutura do Projeto

```
fabulove-erp/
├── server/
│   ├── adapters/          # Marketplace adapters
│   ├── config/            # Database, guards, OpenAPI
│   ├── controllers/       # 16 controllers
│   ├── middleware/        # Error handler, rate limit
│   ├── models/            # 8 models
│   ├── routes/            # 18 rotas
│   ├── scripts/           # Seed, migrate, backup
│   ├── services/          # AI, import, email, marketplace
│   ├── tests/             # 12 arquivos de teste
│   └── utils/             # JWT, logger, validation
├── client/
│   ├── src/
│   │   ├── components/    # 14 componentes reutilizáveis
│   │   ├── views/         # 20 views + 2 layouts
│   │   ├── stores/        # Pinia auth store
│   │   ├── router/        # vue-router + guards
│   │   └── utils/         # API client (axios)
│   └── dist/              # Build otimizado
├── docs/
│   ├── project-intelligence/  # Docs do projeto
│   ├── AUDITORIA_COMPLETA.md
│   └── STATUS_PROJETO.md
├── tests/e2e/             # Playwright tests
├── Dockerfile*            # 3 Dockerfiles
├── docker-compose*.yml    # Configuração Docker
├── playwright.config.mjs
└── vitest.config.js
```

---

## 🔒 Segurança

- ✅ Helmet (HTTP headers seguros)
- ✅ CORS configurado
- ✅ Rate limiting (auth: 20/15min, API: 300/15min)
- ✅ bcrypt 12 rounds para senhas
- ✅ JWT com access + refresh tokens
- ✅ Mensagens de erro genéricas (anti-enumeration)
- ✅ `.env` ignorado pelo Git

---

## 🚧 Status das Fases

| Fase | Título               | Status                                       |
| ---- | -------------------- | -------------------------------------------- |
| 1    | Fundação             | ✅ Completa                                  |
| 2    | Entidades de Negócio | ✅ Completa                                  |
| 3    | Supply Chain         | ✅ Completa                                  |
| 4    | PDV                  | ⚠️ 85% (backend completo, frontend pendente) |
| 5    | Shopee               | ✅ Completa                                  |
| 6    | Importador Universal | ✅ Completa                                  |
| 7    | Auditoria            | ✅ Completa                                  |
| 8    | Automação IA         | ⚠️ 75% (bloqueado por API keys)              |
| 9    | Criativos IA         | ❌ Pendente                                  |
| 10   | Marketplaces Extras  | ⚠️ 90% (ML pronto, TikTok skeleton)          |
| 11   | Deploy/Infra         | ⚠️ 50% (Docker pronto, deploy pendente)      |

---

## 📈 Roadmap

### Próximos Passos

1. Refatorar PosView (1350 → ~400 linhas)
2. Completar refatoração das 9 views restantes
3. Configurar API keys (NVIDIA NIM, Shopee, ML)
4. Reescrever testes Playwright
5. Criar README.md (este arquivo)
6. Commitar + push para GitHub
7. Deploy em Supabase + Vercel

### Pendências Técnicas

- Encryption at rest dos tokens de marketplace
- Backup automático do banco
- Tests E2E com Playwright (browser real)
- Multi-tenancy (decisão arquitetural)
- WebSockets para notificações em tempo real

---

## 🤝 Contribuindo

Este é um projeto pessoal de uso interno. Para fork ou contribuições:

1. Fork o repositório
2. Crie branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -am 'feat: adicionei X'`)
4. Push para branch (`git push origin feature/nova-funcionalidade`)
5. Crie Pull Request

---

## 📄 Licença

MIT — Projeto pessoal de automação de e-commerce.

---

_Gerenciado com Claude Code | Última atualização: 2026-11-03_
