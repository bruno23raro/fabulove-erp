# STATE.md — Estado do Projeto Fabulove ERP

**Última atualização:** 2026-10-28

---

## Status Geral

| Métrica | Valor |
|---------|-------|
| Branch atual | npm-audit-update |
| Último commit | 6a80da5 |
| Testes unitários | 97/97 passing |
| Testes E2E | 28/28 passing |
| Migrações | 21/21 aplicadas |
| Build frontend | ✅ Sucesso |
| Vulnerabilidades npm | 2 high (xlsx), 1 moderate (qs) |

---

## Tarefas Concluídas

- [x] Fundação (Node/Express + PostgreSQL + JWT)
- [x] Entidades de negócio (Produtos, Categorias, Clientes, Pedidos)
- [x] Supply chain (Fornecedores, Compras, Estoque)
- [x] PDV (Ponto de Venda completo)
- [x] Shopee OAuth 2.0
- [x] Importador Universal (CSV/XLSX/JSON/XML/ZIP)
- [x] Auditoria e correções
- [x] Engenharia reversa do Olist ERP
- [x] Documentação completa (OLIST_FEATURE_MAP + GAP ANALYSIS)

---

## Próximos Passos (em ordem)

1. Configurar SMTP (recuperação de senha real)
2. Configurar OpenAI API Key (automação IA)
3. Adicionar Mercado Livre integration
4. Criar CRM (pipeline de vendas)
5. Dashboard avançado (mapa, horários, devoluções)
6. Módulo Agenda
7. ESLint + Prettier
8. Dockerfile + docker-compose

---

## Bloqueios

- OpenAI API Key não configurada → módulo IA é placeholder
- SMTP não configurado → reset de senha simula envio
- Mercado Livre credentials não disponíveis
- SEFAZ não homologado → módulo NF-e pendente
- Partner bancário não definido → Conta Digital/PIX pendente

---

## Arquivos de Referência

- PROJECT_STATE.md — inventário completo
- PLAN_ORIGINAL.md — plano de 11 fases
- ROADMAP.md — tarefas por prioridade
- docs/STATUS_PROJETO.md — status detalhado
- docs/OLIST_FEATURE_MAP.md — mapa de features do Olist
- docs/OLIST_GAP_ANALYSIS.md — análise de gaps
- docs/IMPORTADOR_UNIVERSAL.md — doc do importador
- CREDENTIALS.local.md — credenciais (não commitar)
