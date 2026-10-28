# PLANO ORIGINAL DO PROJETO — Fabulove ERP

Este documento descreve o plano original que guiou o desenvolvimento do projeto,
reconstruído a partir dos commits, docs e código existentes.

---

## FASE 1: Fundação (2026-10-13)
**Objetivo:** Infraestrutura base funcional

- Node.js + Express setup
- PostgreSQL connection com pool
- Migrações idempotentes (schema_migrations table)
- Seed de dados iniciais (admin user, categorias, produtos exemplo)
- Estrutura de pastas: server/, client/, docs/
- Autenticação JWT (access + refresh token)
- Middleware: helmet, cors, compression, morgan, rate limiting
- Password reset com email (forgot + reset flow)

**Entregáveis:**
- `server/app.js` — servidor Express
- `server/config/database.js` — pool PostgreSQL
- `server/migrations/` — 6 migrations iniciais
- `server/scripts/seed.js` e `seed_data.js`
- `server/models/user.model.js` — auth model
- `client/src/main.js` — Vue app entry
- `client/src/stores/auth.js` — auth store
- `client/src/views/LoginView.vue` — login page

---

## FASE 2: Entidades de Negócio (2026-10-13 a 14)
**Objetivo:** CRUD completo das entidades principais

- Produtos (com categoria, preço, custo, estoque)
- Categorias
- Clientes (com documento CPF/CNPJ)
- Pedidos (com itens, status flow, dedução de estoque)
- Dashboard com métricas

**Entregáveis:**
- `server/models/product.model.js`
- `server/models/category.model.js`
- `server/models/customer.model.js`
- `server/models/order.model.js`
- `server/controllers/*.controller.js`
- `server/routes/*.routes.js`
- `client/src/views/ProductsView.vue`
- `client/src/views/CategoriesView.vue`
- `client/src/views/CustomersView.vue`
- `client/src/views/OrdersView.vue`
- `client/src/views/DashboardView.vue`

---

## FASE 3: Supply Chain (2026-10-14)
**Objetivo:** Gestão de fornecedores e compras

- Fornecedores (cadastro completo com documento)
- Compras (ordens de compra, recebimento, impacto no estoque)
- Contas a pagar (geração automática nas compras)
- Movimentações de estoque (entrada/saída com auditoria)

**Entregáveis:**
- `server/models/` — sem novo modelo, uso direto do pool
- `server/controllers/supplier.controller.js`
- `server/controllers/purchase.controller.js`
- `server/controllers/stock.controller.js`
- `server/controllers/financial.controller.js`
- `client/src/views/SuppliersView.vue`
- `client/src/views/PurchasesView.vue`
- `client/src/views/StockView.vue`
- `client/src/views/AccountsPayableView.vue`

---

## FASE 4: PDV — Ponto de Venda (2026-10-15)
**Objetivo:** Sistema de caixa para vendas presenciais

- Carrinhos de venda (criar, adicionar itens, salvar como pré-venda)
- Finalização de venda (múltiplos pagamentos, desconto)
- Cancelamento e estorno
- Caixa (abertura, movimentações, fechamento)
- Busca por barcode (compatível com leitor)
- Histórico de vendas e relatório diário

**Entregáveis:**
- `server/models/pos.model.js` — modelo PDV completo
- `server/controllers/pos.controller.js`
- `server/routes/pos.routes.js`
- `server/migrations/20261015100000_create_pos_sales.sql`
- `server/migrations/20261015110000_alter_orders_customer_nullable.sql`
- `client/src/views/PosView.vue`
- `client/src/views/CashView.vue`

---

## FASE 5: Marketplace Shopee (2026-10-16)
**Objetivo:** Integração com Shopee para sincronização de produtos

### Versão 1 (deprecated):
- Login com email + senha (não mais suportado pela Shopee)

### Versão 2 (atual):
- OAuth 2.0 Partner flow
- Autorização via URL assinada
- Callback com troca de code por tokens
- Refresh token automático
- Sincronização de produtos
- Exportação CSV
- Logs de sincronização

**Entregáveis:**
- `server/services/shopee.service.js`
- `server/controllers/shopee.controller.js`
- `server/routes/marketplace.routes.js`
- `server/migrations/20261016000000_add_price_shopee_to_products.sql`
- `server/migrations/20261016000001_add_shopee_tables.sql`
- `server/migrations/20261016100000_add_shopee_email_auth.sql`
- `server/migrations/20261020000000_add_shopee_oauth_columns.sql`
- `client/src/views/MarketplaceView.vue`

---

## FASE 6: Importador Universal (2026-10-20)
**Objetivo:** Importar produtos de múltiplos formatos com wizard UI

- Detecção automática de formato (CSV, XLSX, JSON, XML, ZIP)
- Análise de headers com mapping fuzzy
- Preview dos dados antes da importação
- Políticas de duplicatas (skip, create, update, review)
- Perfis de importação salvos
- Extração e associação de imagens de ZIP
- Barra de progresso

**Entregáveis:**
- `server/services/import/` — 12 arquivos
- `server/controllers/import.controller.js`
- `server/routes/product.routes.js` (rotas de import)
- `server/migrations/20261020000001_add_import_profiles.sql`
- `server/migrations/20261020000002_add_product_images.sql`
- `client/src/views/ProductsView.vue` (modal de importação)
- `docs/IMPORTADOR_UNIVERSAL.md`

---

## FASE 7: Auditoria e Correções (2026-10-20)
**Objetivo:** Estabilizar o sistema antes de novas features

- Corrigir bug crítico do botão PDV (canComplete sempre disabled)
- Padronizar formato de respostas de erro em todos os controllers
- Reescrita completa do Shopee para OAuth 2.0
- Adicionar 16 novos testes de unidade
- Verificar todas as 28 rotas E2E
- Verificar 18 migrations idempotentes
- Atualizar npm audit

**Resultados:**
- 97 testes unitários passing
- 28 testes E2E passing
- 0 vulnerabilidades em production
- Build Vite funcionando

---

## FASE 8: Automação com IA (PENDENTE)
**Objetivo:** Recursos de IA para automação de e-commerce

- OCR de NF-e (extração de dados de notas fiscais)
- Geração automática de títulos otimizados para SEO
- Geração de descrições persuasivas
- Sugestão de preços baseada em margem
- Análise de performance e insights

**Bloqueado por:** OPENAI_API_KEY não configurado

---

## FASE 9: Criativos com IA (PENDENTE)
**Objetivo:** Geração de conteúdo visual para produtos

- Criação de imagens de produto com DALL-E
- Criação de vídeos promocionais para TikTok Shop
- Templates personalizáveis
- Biblioteca de assets

**Bloqueado por:** Depende da Fase 8 (OpenAI)

---

## FASE 10: Marketplaces Extras (PENDENTE)
**Objetivo:** Ampliar integrações além da Shopee

- Mercado Livre (API REST)
- TikTok Shop
- Amazon (Marketplace Web Services)
- Magalu (API de integração)

**Bloqueado por:** Credenciais de API não fornecidas

---

## FASE 11: Infraestrutura de Deploy (PENDENTE)
**Objetivo:** Preparar para produção

- Dockerfile para backend e frontend
- docker-compose.yml com PostgreSQL
- CI/CD com GitHub Actions (workflow existe mas incompleto)
- Backup automático do banco
- Monitoramento de saúde
- Logging estruturado com trace IDs

---

## RESUMO DO PLANO

| Fase | Título | Status |
|------|--------|--------|
| 1 | Fundação | ✅ Completa |
| 2 | Entidades de Negócio | ✅ Completa |
| 3 | Supply Chain | ✅ Completa |
| 4 | PDV | ✅ Completa |
| 5 | Shopee | ✅ Completa |
| 6 | Importador Universal | ✅ Completa |
| 7 | Auditoria | ✅ Completa |
| 8 | Automação IA | ❌ Pendente (OpenAI key) |
| 9 | Criativos IA | ❌ Pendente (depende de 8) |
| 10 | Marketplaces Extras | ❌ Pendente (credenciais) |
| 11 | Deploy/Infra | ❌ Pendente |
