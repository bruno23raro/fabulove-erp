# INVENTÁRIO DO PROJETO SIZEN ERP

**Data:** 2026-10-28  
**Path absoluto:** `C:\Users\brunow\fabulove-erp`

---

## RESUMO EXECUTIVO

Fabulove ERP é um sistema completo de e-commerce com PDV, gestão de estoque, pedidos, financeiro e marketplace (Shopee). Stack: Node.js/Express + Vue 3/Vite + PostgreSQL. Backend rodando, frontend em Vue, banco com 21 migrations aplicadas, 97 testes unitários passando, 28 E2E passing. Importador universal multi-formato (CSV/XLSX/JSON/XML/ZIP) funcional. Shopee integrado via OAuth 2.0 Partner flow. Módulo de automação IA pendente (OpenAI key não configurada). Projeto em branch `npm-audit-update`, com 3 vulnerabilidades dev-only pendentes e 2 no xlsx.

---

## 1. VISÃO GERAL

### Nome do projeto
SIZEN AI Seller Agent - ERP

### Objetivo
ERP completo para automação de e-commerce com integração de IA, gestão de produtos, pedidos, estoque, financeiro e marketplace (Shopee).

### Caminho absoluto
`C:\Users\brunow\fabulove-erp`

### Repositório git
- Remote: `git@github.com:brunow/fabulove-erp.git` (SSH)
- Também tem origin: `https://github.com/bruno23raro/fabulove-erp.git`
- Branch atual: `npm-audit-update`
- Último commit: `6a80da5` — "Add real E2E validation script and fix price validation bug"
- Data do último commit: 2026-10-21

### Stack completa
| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Runtime | Node.js | v24.21.0 |
| Pacote | npm | 11.19.0 |
| Backend | Express | ^4.18.2 |
| Frontend | Vue.js | ^3.3.11 |
| Build | Vite | ^8.3.4 |
| Estado | Pinia | ^2.1.7 |
| Rotas | vue-router | ^4.2.5 |
| Banco | PostgreSQL | (DB_NAME=fabulove_erp) |
| ORM | pg (node-postgres) | ^8.11.3 |
| Gráficos | Chart.js | ^4.4.0 |
| Testes | Vitest | ^5.0.5 |
| E2E | supertest | ^6.3.4 |
| Browser | Playwright | ^1.64.1 |
| Auth | jsonwebtoken | ^9.0.2 |
| Senhas | bcryptjs | ^2.4.3 |
| Logs | Winston | ^3.19.0 |
| Email | Nodemailer | ^10.1.7 |
| Upload | multer | ^1.4.5-lts.1 |
| Import CSV | papaparse | ^5.7.0 |
| Import Excel | xlsx | ^0.18.5 |
| Import ZIP | jszip | ^3.10.2 |
| Import XML | fast-xml-parser | ^5.11.2 |
| Import ZIP | adm-zip | ^0.6.1 |

### Gerenciador de pacotes
npm (package-lock.json presente)

### Banco de dados
PostgreSQL — database: `fabulove_erp`, host: `localhost:5432`, user: `postgres`

---

## 2. PLANO ORIGINAL (do início até hoje)

O projeto foi construído iterativamente através de múltiplas sessões de desenvolvimento. O plano inicial (documentado no CLAUDE.md original) previa:

### Fases originais definidas:
1. **Infraestrutura base** — Node/Express, PostgreSQL, schema migrations, auth JWT
2. **Produtos e catálogos** — CRUD completo, categorias, estoque, busca
3. **Pedidos e clientes** — Gestão de pedidos, clientes, endereços
4. **PDV (Ponto de Venda)** — Carrinho, finalização, caixa, relatórios diários
5. **Financeiro** — Contas a pagar/receber, movimentações de caixa
6. **Marketplaces** — Integração com Shopee, Mercado Livre, TikTok Shop
7. **Importação universal** — Importar produtos de CSV/XLSX/JSON/XML/ZIP
8. **Automação com IA** — OCR NF-e, precificação automática, SEO títulos/descrições
9. **Criativos com IA** — Geração de imagens/vídeos com DALL-E/IA
10. **Dashboard e relatórios** — Analytics, KPIs, gráficos

### Mudanças ao longo do tempo:
- **2026-10-13**: Infraestrutura base + auth + schema inicial criados
- **2026-10-14**: Categorias, clientes, suppliers, purchases adicionados
- **2026-10-15**: Barcode, PDV (pos_sales), stock movements criados
- **2026-10-16**: Shopee integration criada (email/senha → depois OAuth)
- **2026-10-20**: Auditoria completa — 3 bugs críticos corrigidos, Shopee OAuth rewrite
- **2026-10-20**: Importador universal multi-formato criado (5 formatos)
- **2026-10-21**: Migrations finalizadas (21 total), E2E tests atualizados

### Status atual das fases:
| Fase | Status | Observação |
|------|--------|------------|
| 1. Infraestrutura | ✅ Completo | Migrations idempotentes, seed funcional |
| 2. Produtos/Catálogos | ✅ Completo | CRUD, busca, barcode, preço Shopee |
| 3. Pedidos/Clientes | ✅ Completo | Fluxo completo com estoque |
| 4. PDV | ✅ Completo | Carrinho, vendas, cancelamento, caixa |
| 5. Financeiro | ✅ Funcional | Contas pagar/receber, cashflow |
| 6. Marketplaces | ⚠️ Parcial | Shopee OAuth funcional; ML/TikTok ausentes |
| 7. Importação | ✅ Completo | Universal, 5 formatos, wizard UI |
| 8. Automação IA | ❌ Não iniciado | OpenAI key não configurada |
| 9. Criativos IA | ❌ Não iniciado | Depende de fase 8 |
| 10. Dashboard | ✅ Funcional | KPIs, gráficos Chart.js |

---

## 3. O QUE JÁ ESTÁ PRONTO (com caminhos reais)

### BACKEND

#### Controllers (13 arquivos)
| Arquivo | Status | Observação |
|---------|--------|------------|
| [server/controllers/auth.controller.js](server/controllers/auth.controller.js) | ✅ Completo | Login, register, forgot/reset password, refresh token |
| [server/controllers/product.controller.js](server/controllers/product.controller.js) | ✅ Completo | CRUD completo, busca, barcode |
| [server/controllers/category.controller.js](server/controllers/category.controller.js) | ✅ Completo | CRUD categorias |
| [server/controllers/customer.controller.js](server/controllers/customer.controller.js) | ✅ Completo | CRUD clientes |
| [server/controllers/order.controller.js](server/controllers/order.controller.js) | ✅ Completo | CRUD pedidos, status flow |
| [server/controllers/dashboard.controller.js](server/controllers/dashboard.controller.js) | ✅ Completo | Métricas consolidadas |
| [server/controllers/stock.controller.js](server/controllers/stock.controller.js) | ✅ Completo | Ajuste de estoque, movimentações |
| [server/controllers/pos.controller.js](server/controllers/pos.controller.js) | ✅ Completo | PDV: carrinhos, vendas, caixa |
| [server/controllers/shopee.controller.js](server/controllers/shopee.controller.js) | ✅ Completo | OAuth, sync, export CSV |
| [server/controllers/supplier.controller.js](server/controllers/supplier.controller.js) | ✅ Completo | CRUD fornecedores |
| [server/controllers/purchase.controller.js](server/controllers/purchase.controller.js) | ✅ Completo | CRUD compras, auto cria conta a pagar |
| [server/controllers/import.controller.js](server/controllers/import.controller.js) | ✅ Completo | Analyze, import, profiles, images |
| [server/controllers/config.controller.js](server/controllers/config.controller.js) | ✅ Completo | Key-value config |
| [server/controllers/financial.controller.js](server/controllers/financial.controller.js) | ✅ Completo | Contas pagar/receber, cash transactions |

#### Models (7 arquivos)
| Arquivo | Status | Observação |
|---------|--------|------------|
| [server/models/product.model.js](server/models/product.model.js) | ✅ Completo | CRUD + barcode + price_shopee |
| [server/models/order.model.js](server/models/order.model.js) | ✅ Completo | CRUD + status flow + estoque |
| [server/models/customer.model.js](server/models/customer.model.js) | ✅ Completo | CRUD + histórico pedidos |
| [server/models/category.model.js](server/models/category.model.js) | ✅ Completo | CRUD + verificação de produtos |
| [server/models/pos.model.js](server/models/pos.model.js) | ✅ Completo | PDV completo + cash register |
| [server/models/user.model.js](server/models/user.model.js) | ✅ Completo | Auth + refresh tokens |
| [server/models/config.model.js](server/models/config.model.js) | ✅ Completo | Key-value store |

#### Rotas (13 arquivos)
| Arquivo | Status | Observação |
|---------|--------|------------|
| [server/routes/auth.routes.js](server/routes/auth.routes.js) | ✅ Completo | Todos os endpoints auth |
| [server/routes/product.routes.js](server/routes/product.routes.js) | ✅ Completo | CRUD + import |
| [server/routes/category.routes.js](server/routes/category.routes.js) | ✅ Completo | CRUD categorias |
| [server/routes/customer.routes.js](server/routes/customer.routes.js) | ✅ Completo | CRUD clientes |
| [server/routes/order.routes.js](server/routes/order.routes.js) | ✅ Completo | CRUD pedidos |
| [server/routes/dashboard.routes.js](server/routes/dashboard.routes.js) | ✅ Completo | Métricas |
| [server/routes/stock.routes.js](server/routes/stock.routes.js) | ✅ Completo | Ajuste + movimentações |
| [server/routes/pos.routes.js](server/routes/pos.routes.js) | ✅ Completo | PDV completo |
| [server/routes/supplier.routes.js](server/routes/supplier.routes.js) | ✅ Completo | CRUD fornecedores |
| [server/routes/purchase.routes.js](server/routes/purchase.routes.js) | ✅ Completo | CRUD compras |
| [server/routes/financial.routes.js](server/routes/financial.routes.js) | ✅ Completo | Financeiro completo |
| [server/routes/report.routes.js](server/routes/report.routes.js) | ✅ Funcional | Vendas e estoque por período |
| [server/routes/marketplace.routes.js](server/routes/marketplace.routes.js) | ✅ Funcional | Shopee apenas |
| [server/routes/automation.routes.js](server/routes/automation.routes.js) | ⚠️ Placeholder | Apenas status check |

#### Serviços
| Arquivo | Status | Observação |
|---------|--------|------------|
| [server/services/shopee.service.js](server/services/shopee.service.js) | ✅ Completo | OAuth 2.0 Partner flow |
| [server/services/import/import.service.js](server/services/import/import.service.js) | ✅ Completo | Importador universal |
| [server/services/import/analyzer.js](server/services/import/analyzer.js) | ✅ Completo | Detecção de formato/mapping |
| [server/services/import/mapper.js](server/services/import/mapper.js) | ✅ Completo | Mapeamento de colunas |
| [server/services/import/normalizer.js](server/services/import/normalizer.js) | ✅ Completo | Normalização de dados |
| [server/services/import/validator.js](server/services/import/validator.js) | ✅ Completo | Validação de dados |
| [server/services/import/image.service.js](server/services/import/image.service.js) | ✅ Completo | Gestão de imagens de importação |
| [server/services/import/formats/csv.js](server/services/import/formats/csv.js) | ✅ Completo | Parser CSV |
| [server/services/import/formats/xlsx.js](server/services/import/formats/xlsx.js) | ✅ Completo | Parser Excel |
| [server/services/import/formats/json.js](server/services/import/formats/json.js) | ✅ Completo | Parser JSON |
| [server/services/import/formats/xml.js](server/services/import/formats/xml.js) | ✅ Completo | Parser XML |
| [server/services/import/formats/zip.js](server/services/import/formats/zip.js) | ✅ Completo | Parser ZIP |
| [server/services/email.js](server/services/email.js) | ✅ Funcional | SMTP ou simulado |

#### Migrations (21 arquivos)
Todas aplicadas e idempotentes:
1. `20261013163000_add_users_table.sql` — Tabela users
2. `20261013183000_create_business_schema.sql` — products, categories, customers, orders
3. `20261013200500_add_schema_migrations.sql` — Controle de migrações
4. `20261013200501_add_stock_movements.sql` — Auditoria de estoque
5. `20261013200502_add_address_discount_audit.sql` — Endereços, descontos, canais
6. `20261013200503_add_financial_tables.sql` — Caixinha, finance tables
7. `20261014090000_add_password_reset_tokens.sql` — Tokens de recuperação
8. `20261014120000_add_suppliers_purchases_finance.sql` — Suppliers, purchases
9. `20261014130000_add_purchase_number_column.sql` — Correção schema
10. `20261014140000_rename_purchase_items_columns.sql` — Correção colunas
11. `20261014150000_sync_purchase_schema.sql` — Sincronização schema
12. `20261015090000_add_barcode_to_products.sql` — Barcode nos produtos
13. `20261015100000_create_pos_sales.sql` — Tabelas PDV
14. `20261015110000_alter_orders_customer_nullable.sql` — Cliente opcional em PDV
15. `20261016000000_add_price_shopee_to_products.sql` — Preço Shopee automático
16. `20261016000001_add_shopee_tables.sql` — Config Shopee
17. `20261016100000_add_shopee_email_auth.sql` — Auth email/senha (deprecated)
18. `20261020000000_add_shopee_oauth_columns.sql` — OAuth columns
19. `20261020000001_add_import_profiles.sql` — Perfis de importação
20. `20261020000002_add_product_images.sql` — Galeria de imagens
21. `20261021000000_add_video_url.sql` — Video URL nos produtos

### FRONTEND

#### Views (18 arquivos Vue)
| Arquivo | Status | Observação |
|---------|--------|------------|
| [client/src/views/LoginView.vue](client/src/views/LoginView.vue) | ✅ Completo | Login com CSRF/token |
| [client/src/views/ResetPasswordView.vue](client/src/views/ResetPasswordView.vue) | ✅ Completo | Reset senha |
| [client/src/views/DashboardView.vue](client/src/views/DashboardView.vue) | ✅ Completo | KPIs + gráficos |
| [client/src/views/ProductsView.vue](client/src/views/ProductsView.vue) | ✅ Completo | Listagem + import modal |
| [client/src/views/CategoriesView.vue](client/src/views/CategoriesView.vue) | ✅ Completo | CRUD categorias |
| [client/src/views/CustomersView.vue](client/src/views/CustomersView.vue) | ✅ Completo | CRUD clientes |
| [client/src/views/OrdersView.vue](client/src/views/OrdersView.vue) | ✅ Completo | Listagem + filtros |
| [client/src/views/SuppliersView.vue](client/src/views/SuppliersView.vue) | ✅ Completo | CRUD fornecedores |
| [client/src/views/PurchasesView.vue](client/src/views/PurchasesView.vue) | ✅ Completo | CRUD compras |
| [client/src/views/StockView.vue](client/src/views/StockView.vue) | ✅ Completo | Movimentações estoque |
| [client/src/views/PosView.vue](client/src/views/PosView.vue) | ✅ Completo | PDV completo |
| [client/src/views/MarketplaceView.vue](client/src/views/MarketplaceView.vue) | ✅ Completo | Shopee config + sync |
| [client/src/views/ConfigView.vue](client/src/views/ConfigView.vue) | ✅ Completo | Configurações sistema |
| [client/src/views/ReportsView.vue](client/src/views/ReportsView.vue) | ✅ Completo | Relatórios vendas/estoque |
| [client/src/views/FinancialDashboardView.vue](client/src/views/FinancialDashboardView.vue) | ✅ Completo | Dashboard financeiro |
| [client/src/views/AccountsReceivableView.vue](client/src/views/AccountsReceivableView.vue) | ✅ Completo | Contas a receber |
| [client/src/views/AccountsPayableView.vue](client/src/views/AccountsPayableView.vue) | ✅ Completo | Contas a pagar |
| [client/src/views/CashView.vue](client/src/views/CashView.vue) | ✅ Completo | Movimentações de caixa |
| [client/src/views/layouts/AppLayout.vue](client/src/views/layouts/AppLayout.vue) | ✅ Completo | Layout principal |
| [client/src/views/layouts/FinancialLayout.vue](client/src/views/layouts/FinancialLayout.vue) | ✅ Completo | Layout financeiro |

#### Stores, Router, Utils
| Arquivo | Status | Observação |
|---------|--------|------------|
| [client/src/stores/auth.js](client/src/stores/auth.js) | ✅ Completo | Auth state + refresh token |
| [client/src/router/index.js](client/src/router/index.js) | ✅ Completo | 15 rotas + guards |
| [client/src/utils/api.js](client/src/utils/api.js) | ✅ Completo | Axios com refresh token |
| [client/src/App.vue](client/src/App.vue) | ✅ Funcional | Mount principal |
| [client/src/main.js](client/src/main.js) | ✅ Funcional | Entry point Vue+Pinia |

#### Componentes
| Diretório | Status | Observação |
|-----------|--------|------------|
| `client/src/components/automation/` | 🔴 Vazio | Placeholder — automação não implementado |
| `client/src/components/common/` | 🔴 Vazio | Reutilizáveis devem ser criados |
| `client/src/components/dashboard/` | 🔴 Vazio | Gráficos inline nas views |
| `client/src/components/marketplaces/` | 🔴 Vazio | Shopee está na view |
| `client/src/components/products/` | 🔴 Vazio | Import modal na ProductsView |
| `client/src/components/settings/` | 🔴 Vazio | Config na ConfigView |
| `client/src/components/ui/` | 🔴 Vazio | Componentes UI não extraídos |
| `client/src/assets/` | 🟡 Mínimo | Apenas arquivos estáticos |

---

## 4. O QUE FALTA PARA CONCLUIR

### Prioridade ALTA (bloqueantes)
1. **Mercado Livre integration** — API não configurada, nenhuma implementação
2. **TikTok Shop integration** — Não existe
3. **OPENAI_API_KEY** — Módulo de automação é placeholder; features de IA não funcionam
4. **SMTP credentials** — Recuperação de senha funciona mas não envia email real
5. **Dockerfile / docker-compose** — Não existe; deployment manual

### Prioridade MÉDIA (melhorias significativas)
6. **Componentes reutilizáveis** — 7 diretórios de componentes vazios
7. **ESLint / Prettier** — Nenhum linter configurado; padrão de código não enforced
8. **Melhorias no importador** — Tratamento de erro mais robusto para campos obrigatórios
9. **Proteção contra SQL injection em raw queries** — Algumas queries usam string interpolation
10. **Cache layer** — Nenhuma cache para queries frequentes (dashboard, produtos)

### Prioridade BAIXA (refinamentos)
11. **Testes E2E com Playwright** — Apenas supertest HTTP; sem browser tests
12. **Documentação API** — Nenhuma spec OpenAPI/Swagger
13. **Backup automático do banco** — Não existe
14. **Monitoramento de saúde** — Health check básico existe mas é simples
15. **Logs estruturados avançados** — Winston básico, sem correlação de trace IDs
16. **Testes de carga** — Nenhum teste de performance

### Bloqueados por:
- **Marketplaces (ML/TikTok)**: dependem de credenciais de API que não foram fornecidas
- **Automação IA**: depende de OPENAI_API_KEY
- **SMTP**: depende de credenciais de email
- **Deploy/Docker**: depende de decisão de infra

---

## 5. INTEGRAÇÕES, MCPs, SKILLS, AGENTES

### MCPs configurados
| Servidor | Status | Uso |
|----------|--------|-----|
| playwright | ✅ Conectado | Testes E2E de browser |
| filesystem | ✅ Conectado | Manipulação de arquivos |
| rea | ❌ TIMEOUT (30s) | Reverse engineering — falhou na conexão |

### Skills disponíveis (não usadas no projeto)
As skills listadas são do Claude Code (find-skills, workflow-authoring, etc.) — nenhuma skill customizada do projeto.

### APIs externas em uso/configuração
| API | Status | Configuração |
|-----|--------|-------------|
| Shopee | ✅ Configurável | OAuth 2.0 Partner flow via `shopee_config` table |
| Mercado Livre | ❌ Não configurado | `MERCADOLIVRE_API_KEY` vazio no .env |
| TikTok Shop | ❌ Não configurado | Nenhum endpoint implementado |
| OpenAI (GPT/DALL-E) | ❌ Não configurado | `OPENAI_API_KEY` vazio no .env |
| SMTP (SendGrid/Gmail) | ❌ Não configurado | `SMTP_HOST` vazio no .env |

### Variáveis de ambiente (.env atual)
```
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=fabulove_erp
DB_PASSWORD=b23b23v1814
PORT=3000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
JWT_SECRET=fabulove-erp-dev-secret-change-in-production-use-128-chars-min
OPENAI_API_KEY=                    # VAZIO
SHOPEE_API_KEY=                    # VAZIO
MERCADOLIVRE_API_KEY=              # VAZIO
MAX_FILE_SIZE=10485760
UPLOAD_DIR=uploads
```

### Variáveis necessárias mas não configuradas
| Variável | Finalidade | Valor atual |
|----------|-----------|-------------|
| OPENAI_API_KEY | Automação IA | vazio |
| SHOPEE_API_KEY | Integração Shopee | vazio (config via UI) |
| MERCADOLIVRE_API_KEY | Mercado Livre | vazio |
| MERCADOLIVRE_ACCESS_TOKEN | ML session | vazio |
| SMTP_HOST | Envio de emails | vazio |
| SMTP_PORT | SMTP | não definido |
| SMTP_USER | SMTP auth | vazio |
| SMTP_PASS | SMTP auth | vazio |
| EMAIL_FROM | Remetente | default: noreply@fabulove.com |
| EMAIL_FROM_NAME | Nome remetente | default: Fabulove AI |

---

## 6. PERSISTÊNCIA

### Onde o estado está salvo
| Arquivo | Conteúdo | Sobrevive restart? |
|---------|----------|-------------------|
| `c:\Users\brunow\.claude\projects\c--Users-brunow-fabulove-erp\memory\` | Memórias Claude (user preferences, project context) | Sim |
| `CLAUDE.md` | Regras permanentes de trabalho | Sim (no Git) |
| `docs/STATUS_PROJETO.md` | Status atualizado | Sim (no Git) |
| `docs/RELATORIO_AUDITORIA_FINAL.md` | Relatório de auditoria | Sim (no Git) |
| `docs/IMPORTADOR_UNIVERSAL.md` | Doc do importador | Sim (no Git) |
| `docs/audit-matrix.json` | Matriz de auditoria | Sim (no Git) |
| `.env` | Credenciais | Não (no .gitignore) |
| Banco PostgreSQL | Dados da aplicação | Sim (persistente) |

### O que sobrevive entre sessões
- Código-fonte (Git)
- Banco de dados (PostgreSQL)
- Memórias do Claude (arquivos em .claude/)
- Documentação (docs/)

### O que se perde entre sessões
- Sessão de desenvolvimento ativa (contexto de RAM)
- Estado de servidores locais (precisa reiniciar)
- Testes em execução
- Sessões JWT (expiram)

---

## 7. RISCOS E PENDÊNCIAS

### Bugs conhecidos
| Severidade | Descrição | Arquivo | Status |
|-----------|-----------|---------|--------|
| 🟡 Médio | npm audit: 2 high (xlsx) + 1 moderate (qs) | package.json | Não corrigido |
| 🟡 Médio | npm audit: 3 high dev-only (braces/chokidar/nodemon) | package.json | Dev-only, ignorável |
| 🟡 Médio | Report controller não existe (report.routes.js usa pool direto) | server/routes/report.routes.js | Funciona mas estrutura inconsistente |
| 🟢 Baixo | Componentes reutilizáveis não extraídos (7 dirs vazios) | client/src/components/ | Melhoria futura |

### TODOs técnicos
- [ ] Adicionar ESLint + Prettier
- [ ] Criar Dockerfile e docker-compose.yml
- [ ] Implementar Mercado Livre integration
- [ ] Implementar TikTok Shop integration
- [ ] Configurar SMTP para emails reais
- [ ] Adicionar cache layer (Redis ou memória)
- [ ] Criar testes E2E com Playwright (browser-based)
- [ ] Documentar API com OpenAPI/Swagger
- [ ] Implementar backup automático do banco
- [ ] Adicionar rate limiting com Redis para produção

### Decisões em aberto
1. **Arquitetura de componentes** — Componentes estão inline nas views; decisão de extração pendente
2. **Multi-tenant** — Sistema é single-tenant; decisão de multi-tenancy não tomada
3. **Deploy** — Sem definição de plataforma (VPS, AWS, Railway, etc.)
4. **Automação IA** — OpenAI key não disponível; módulo permanece como placeholder

---

## DADOS DO BANCO (estado atual)
- Tguras: 24 (incluindo shopee, import, pos, financial)
- Produtos: ~1045 (seed + dados reais)
- Pedidos: 40
- Usuários: 4
- Migrations aplicadas: 21/21

## RESULTADO DOS TESTES
- Unit tests: 97/97 passing (vitest)
- E2E tests: 28/28 passing (supertest)
- Build: ✅ funciona (vite)
- Migrations: ✅ 21/21 aplicadas
