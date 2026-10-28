# ROADMAP — Fabulove ERP

Roadmap atualizado em 2026-10-28. Ordenado por prioridade e dependência.

---

## PRIORIDADE 1 — Críticos (bloqueiam funcionalidades essenciais)

### 1.1 Configurar OpenAI API Key
- **Impacto:** Habilita módulo de automação IA
- **Arquivos afetados:** `.env`, `server/routes/automation.routes.js`
- **Blocante:** Nenhuma dependência externa
- **Tarefa:** Obter chave OpenAI e adicionar ao `.env`
- **Depende de:** Nenhum

### 1.2 Configurar SMTP para emails
- **Impacto:** Recuperação de senha funcional (hoje simula)
- **Arquivos afetados:** `.env`, `server/services/email.js`
- **Blocante:** Nenhuma dependência
- **Tarefas:**
  - Configurar SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
  - Ou usar SendGrid/Mailgun API key
- **Depende de:** Nenhum

### 1.3 Adicionar Mercado Livre Integration
- **Impacto:** Vender em mais um marketplace
- **Arquivos a criar:**
  - `server/services/ml.service.js`
  - `server/controllers/ml.controller.js`
  - `server/routes/ml.routes.js` (ou expandir marketplace.routes.js)
  - `server/migrations/20261028000000_add_mercadolivre_tables.sql`
  - `client/src/views/MarketplaceView.vue` (adicionar aba ML)
- **Blocante:** Credenciais do Mercado Livre (APP_CREDENTIALS)
- **Depende de:** Nenhum (exceto credenciais)

---

## PRIORIDADE 2 — Importantes (melhoram qualidade e usabilidade)

### 2.1 Extrair componentes reutilizáveis
- **Impacto:** Manutenibilidade do frontend
- **Diretórios a povoar:**
  - `client/src/components/common/` — Modal, Table, FormField, Badge
  - `client/src/components/ui/` — Button, Input, Select, Card
  - `client/src/components/dashboard/` — StatCard, ChartWidget
- **Arquivos existentes para refatorar:** Todas as 18 views
- **Blocante:** Nenhum
- **Depende de:** Nenhum

### 2.2 Adicionar ESLint + Prettier
- **Impacto:** Consistência de código, prevenção de bugs
- **Arquivos a criar:**
  - `.eslintrc.cjs` ou `.eslintrc.json`
  - `.prettierrc`
  - `eslint.config.js` (se usando flat config)
- **Blocante:** Nenhum
- **Depende de:** Nenhum

### 2.3 Criar Dockerfile e docker-compose.yml
- **Impacto:** Reproduzibilidade do ambiente, deploy simplificado
- **Arquivos a criar:**
  - `Dockerfile` (backend)
  - `Dockerfile.frontend` (frontend)
  - `docker-compose.yml`
- **Blocante:** Nenhum
- **Depende de:** Nenhum

### 2.4 Corrigir vulnerabilidades do npm audit
- **Impacto:** Segurança
- **Vulnerabilidades:**
  - xlsx: high (prototype pollution, ReDoS) — sem fix disponível
  - qs: moderate (DoS via trailing bytes) — fix: `npm audit fix`
- **Ação:** Atualizar dependências ou aceitar risco (dev-only)
- **Blocante:** Nenhuma
- **Depende de:** Nenhum

---

## PRIORIDADE 3 — Desejáveis (melhorias de qualidade)

### 3.1 Adicionar testes E2E com Playwright
- **Impacto:** Cobertura de fluxo completo do usuário
- **Arquivo a criar:** `tests/e2e/playwright.spec.js`
- **Blocante:** Nenhum
- **Depende de:** Playwright já instalado (`@playwright/test`)

### 3.2 Documentar API com OpenAPI/Swagger
- **Impacto:** Facilita integração e debugging
- **Arquivo a criar:** `docs/api-spec.yaml` ou usar `swagger-jsdoc`
- **Blocante:** Nenhum
- **Depende de:** Nenhum

### 3.3 Adicionar cache layer
- **Impacto:** Performance em dashboards e listagens
- **Opções:** Redis (produção) ou memory-cache (dev)
- **Arquivos a criar:** `server/services/cache.service.js`
- **Blocante:** Nenhum
- **Depende de:** Nenhum

### 3.4 Melhorar tratamento de erros no importador
- **Impacto:** Robustez em importações com dados sujos
- **Arquivos a modificar:** `server/services/import/validator.js`
- **Blocante:** Nenhum
- **Depende de:** Nenhum

### 3.5 Adicionar backup automático do banco
- **Impacto:** Segurança de dados
- **Arquivo a criar:** `server/scripts/backup.js` + cron job
- **Blocante:** Nenhum
- **Depende de:** Nenhum

---

## PRIORIDADE 4 — Futuro (features avançadas)

### 4.1 TikTok Shop Integration
- **Impacto:** Novo canal de vendas
- **Blocante:** Credenciais TikTok Developer
- **Depende de:** Nenhum

### 4.2 Multi-tenancy
- **Impacto:** Suportar múltiplas empresas no mesmo ERP
- **Blocante:** Decisão arquitetural
- **Depende de:** Nenhum

### 4.3 App Mobile
- **Impacto:** Acesso mobile ao ERP
- **Blocante:** Decisão de tech stack (React Native? Flutter?)
- **Depende de:** API REST estável

### 4.4 Notificações em tempo real (WebSockets)
- **Impacto:** Alertas de estoque baixo, novos pedidos
- **Blocante:** Nenhuma
- **Depende de:** Nenhum

---

## RESUMO

| Prioridade | Qtd | Status |
|------------|-----|--------|
| 1 — Críticos | 3 | Aguardando credenciais externas |
| 2 — Importantes | 4 | Pode começar agora |
| 3 — Desejáveis | 5 | Melhorias contínuas |
| 4 — Futuro | 4 | Roadmap de longo prazo |
| **Total** | **16** | |

### Próximos passos recomendados (nesta ordem):
1. Configurar SMTP (habilita recuperação de senha)
2. Configurar OpenAI API Key (habilita automação)
3. Adicionar ESLint + Prettier (qualidade de código)
4. Criar Dockerfile (facilita deploy)
5. Extrair componentes reutilizáveis (manutenibilidade)
