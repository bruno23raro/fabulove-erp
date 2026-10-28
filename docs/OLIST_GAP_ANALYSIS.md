# Olist ERP vs Fabulove ERP — Gap Analysis

**Data:** 2026-10-28  
**Fonte:** OLIST_FEATURE_MAP.md + inventário do Fabulove ERP

---

## 1. Resumo Executivo

| Dimensão | Olist ERP | Fabulove ERP | Diferença |
|----------|-----------|--------------|-----------|
| Stack | PHP/xajax + React/TS | Node/Express + Vue 3 | Tecnologia diferente |
| Módulos mapeados | ~40+ funcionalidades | ~25 funcionalidades | Olist tem ~15 a mais |
| Marketplaces | Shopee, ML, etc. | Shopee apenas | Falta ML, TikTok |
| PDV | Completo | Completo ✅ | Equivalente |
| Financeiro | Caixa, contas, extratos, PIX | Caixa, contas | Falta PIX, extrato |
| CRM | Pipeline, funil, leads | Nenhum | Gap significativo |
| Notas fiscais | NF-e, NFS-e | Nenhum | Gap crítico |
| Integrações | Multi-marketplace | Shopee apenas | Gap grande |
| IA | Lis (assistente) | Placeholder | Gap grande |
| Multi-tenant | Sim (multi-empresa) | Não | Gap arquitetural |
| Testes | Não visível | 97 unit + 28 E2E | Fabulove ganha em testes |

---

## 2. Gaps por Módulo

### 2.1. CRM (Vendas) — GAP CRÍTICO
**Olist possui:**
- Pipeline de vendas com funil
- Assuntos/leads com статус
- Ações pendentes por assunto
- Visualização de vendas por canal
- Integração com dashboard

**Fabulove NÃO possui:**
- Nenhum módulo CRM
- Nenhum pipeline de vendas
- Nenhum conceito de lead/assunto

**Prioridade:** 🔴 Alta  
**Complexidade:** Média  
**Estimativa:** 2-3 sprints

---

### 2.2. Notas Fiscais (NF-e/NFS-e) — GAP CRÍTICO
**Olist possui:**
- Emissão de NF-e (Nota Fiscal Eletrônica)
- NFS-e (Nota Fiscal de Serviço)
- Status de envio
- Integração com Shopee para dados fiscais

**Fabulove NÃO possui:**
- Nenhum módulo fiscal
- Nenhuma emissão de nota
- Nenhum cálculo de impostos

**Prioridade:** 🟡 Alta (depende de homologação SEFAZ)  
**Complexidade:** Alta  
**Estimativa:** 3-4 sprints + integração SEFAZ

---

### 2.3. Conta Digital / PIX — GAP MÉDIO
**Olist possui:**
- Conta bancária digital integrada
- PIX grátis
- Transferências
- Extrato bancário integrado

**Fabulove NÃO possui:**
- Integração bancária
- PIX
- Extrato bancário

**Prioridade:** 🟡 Média  
**Complexidade:** Alta (requer API bancária)  
**Estimativa:** Depende de parceiro financeiro

---

### 2.4. Multимarketplace — GAP MÉDIO
**Olist possui:**
- Shopee ✅ (Fabulove tem)
- Mercado Livre ❌
- TikTok Shop ❌
- Amazon ❌
- Magalu ❌

**Fabulove possui:**
- Shopee ✅

**Prioridade:** 🟢 Média  
**Complexidade:** Média por marketplace  
**Estimativa:** 1 sprint por marketplace

---

### 2.5. Dashboard Avançado — GAP PEQUENO
**Olist possui:**
- Gráfico de vendas por período
- Ticket médio
- Pedidos por integração
- Pedidos por estado (mapa)
- Funil de CRM
- Produtos mais vendidos
- Horários com mais vendas
- Vendas vs devoluções

**Fabulove possui:**
- KPIs básicos de vendas
- Gráfico de vendas
- Top produtos

**O que falta no Fabulove:**
- Vendas por estado (mapa)
- Funil de CRM (não existe CRM)
- Horários com mais vendas
- Vendas vs devoluções
- Pedidos por integração (sem multi-marketplace)

**Prioridade:** 🟢 Baixa-Média  
**Complexidade:** Baixa  
**Estimativa:** 1 sprint

---

### 2.6. Agendar/Calendário — GAP PEQUENO
**Olist possui:**
- Calendário mensal/semanal/diário
- Compromissos próprios e de outros usuários
- Notificações de compromissos

**Fabulove NÃO possui:**
- Módulo de agenda

**Prioridade:** 🟢 Baixa  
**Complexidade:** Baixa  
**Estimativa:** 1 sprint

---

### 2.7. Control de Stock Avançado — GAP PEQUENO
**Olist possui:**
- Controle de estoque completo
- Ordens de compra
- Serviços tomados
- Notas de entrada
- Conferência de compra
- Necessidades de compra
- Giro de estoque
- FCI (forecast de consumo)

**Fabulove possui:**
- Movimentações de estoque ✅
- Compras ✅
- Ajustes de estoque ✅

**O que falta:**
- Ordens de compra com aprovação
- Conferência de compra
- Necessidades de compra (recompra automática)
- Giro de estoque
- FCI (forecast)

**Prioridade:** 🟢 Baixa  
**Complexidade:** Média  
**Estimativa:** 2 sprints

---

### 2.8. Painel do Contador — GAP NOVO
**Olist possui:**
- Área compartilhada com contador
- Acesso para contador externo

**Fabulove NÃO possui.**

**Prioridade:** 🟡 Média (valor para usuário)  
**Complexidade:** Média  
**Estimativa:** 1-2 sprints

---

### 2.9. Ferramentas / Utilitários — GAP PEQUENO
**Olist possui:**
- Ferramentas gerais (import/export avançado)
- Loja de extensões
- Shopping de serviços

**Fabulove possui:**
- Importador universal ✅

**O que falta:**
- Exportação avançada (PDF, Excel formatado)
- Sistema de extensões/plugins

**Prioridade:** 🟢 Baixa  
**Complexidade:** Variada

---

### 2.10. IA / Automação — GAP GRANDE
**Olist possui:**
- Lis (assistente de IA para Shopify)
- Agents.olist.com (chatbot IA)

**Fabulove possui:**
- Módulo de automação placeholder (sem OpenAI key)

**O que falta:**
- Integração com OpenAI/LLM
- Assistente de IA integrado
- OCR de notas fiscais
- Geração de descrições
- Sugestão de preços

**Prioridade:** 🟡 Alta (diferencial competitivo)  
**Complexidade:** Média  
**Estimativa:** 1-2 sprints (após configurar OpenAI)

---

### 2.11. Multi-tenancy — GAP ARQUITETURAL
**Olist possui:**
- Multi-empresa (cada cliente é uma empresa)
- Sessão por empresa
- Dados isolados por empresa

**Fabulove possui:**
- Single-tenant (usuários na mesma base)
- Role-based (admin/vendedor)

**O que falta:**
- Campo `company_id` em todas as tabelas
- Middleware de isolamento
- Migração de dados existente

**Prioridade:** 🟡 Alta (para escalar como SaaS)  
**Complexidade:** Alta (mudança arquitetural)  
**Estimativa:** 3-4 sprints

---

## 3. Funcionalidades que o Fabulove JÁ TEM (e o Olist também)

✅ Autenticação JWT  
✅ CRUD de Produtos  
✅ CRUD de Categorias  
✅ CRUD de Clientes/Fornecedores  
✅ CRUD de Pedidos  
✅ PDV (Ponto de Venda)  
✅ Controle de Estoque  
✅ Compras  
✅ Financeiro (contas a pagar/receber)  
✅ Dashboard básico  
✅ Importador Universal  
✅ Shopee OAuth  
✅ Relatórios básicos  
✅ 97 testes unitários + 28 E2E  
✅ Migrações idempotentes  

---

## 4. Priorização Sugerida para Implementação

### Sprint 1-2: CRM Básico
- Modelos: Lead, Assunto, Pipeline
- Controller + routes
- Frontend: vista de pipeline drag-and-drop
- Integração com dashboard

### Sprint 3: Dashboard Avançado
- Mapa de vendas por estado
- Gráfico de horários com mais vendas
- Vendas vs devoluções
- Pedidos por marketplace

### Sprint 4: Agenda
- Modelos: Evento, Participante
- Calendário frontend
- Notificações

### Sprint 5: Mercado Livre Integration
- Service + controller + routes
- Sync de produtos e pedidos
- OAuth do Mercado Livre

### Sprint 6: Exportação Avançada
- PDF de pedidos
- Excel formatado
- CSV personalizado

### Sprint 7+: Notas Fiscais
- Projeto separado (depende de homologação SEFAZ)

### Sprint 8+: Conta Digital / PIX
- Projeto separado (depende de parceria bancária)

---

## 5. Vantagens do Fabulove sobre o Olist

1. **Testes:** 97 unitários + 28 E2E vs nenhum teste visível no Olist
2. **Stack moderna:** Node/Express + Vue 3 vs PHP/xajax
3. **Importador universal:** Suporta 5 formatos vs importação básica do Olist
4. **Código aberto:** Pode ser modificado livremente
5. **Sem paywall:** Funcionalidades completas sem assinatura
6. **Local:** Dados ficam no PostgreSQL local

---

## 6. Conclusão

O Fabulove ERP já cobre ~60% das funcionalidades do Olist ERP. Os gaps principais são:

1. **CRM** (mais alto impacto para vendas)
2. **Multi-marketplace** (Mercado Livre)
3. **Dashboard avançado** (visualizações Rich)
4. **Agenda** (organização)
5. **IA/Automação** (diferencial futuro)

O Fabulove é tecnicamente superior (testes, stack, código limpo) mas funcionalmente incompleto em áreas estratégicas.

---

*Gap analysis gerado em 2026-10-28 com base no OLIST_FEATURE_MAP.md*
