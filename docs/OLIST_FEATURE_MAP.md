# Olist ERP — Mapa Completo de Funcionalidades

**Data da análise:** 2026-10-28  
**Versão do sistema:** 3.92.91  
**Source:** Engenharia reversa via Playwright MCP + captura de rede  
**URL:** https://erp.olist.com

---

## 1. Arquitetura Técnica

### Backend
- **Linguagem:** PHP
- **Framework:** xajax (AJAX PHP) + Reforma Sistema Server v2
- **Padrão de API:** `POST /services/reforma.sistema.server/2/{Namespace}\{Class}/{method}`
- **Endpoints de serviço adicionais:**
  - `/services/auth.services.php?a=ping` — heartbeat de sessão
  - `/services/multi.empresa.auth.services.php` — auth multi-empresa
  - `/services/notificacoes.services.php` — notificações
  - `/services/caixa.server/2/...` — módulo financeiro
  - `/services/crm.server/1/listarCrm` — lista CRM
  - `/services/nfse.server/` — NFS-e (notas fiscais)

### Frontend
- **Framework JS:** jQuery 1.11.1 + xajax
- **Moderno (Module Federation):** Webpack + React 18 + styled-components 5.3.11
- **Build:** front-core.tMKdCTup.js (3.4 MB, Vite/webpack federation)
- **CSS:** Tailwind CSS via `om:` prefixes (Olist Design System)
- **Ícones:** Font Awesome + ícones SVG inline
- **Routing:** Hash-based (#/list, #/novo, #/pesquisar-produtos)
- **Autenticação:** OpenID Connect via Tiny (`accounts.tiny.com.br`, Keycloak)
- **Cookie de sessão:** `logado` (valor JWT-like)

### Monitoramento
- Google Tag Manager (GTM-T2S5NS5)
- Google Analytics 4 (G-K95LQFJ49W)
- Facebook Pixel + OpenBridge
- Mixpanel
- Hotjar (`_hjSession_*`)
- Microsoft Clarity (`f.clarity.ms`)
- Sentry (`sentry.olist.com`)

---

## 2. Módulos Principais (Navegação)

### 2.1. ERP (Core)
| Seção | URL | Descrição |
|-------|-----|-----------|
| Início | `index` | Dashboard principal com KPIs |
| Cadastros | `contatos` | Clientes, fornecedores, produtos |
| Suprimentos | `estoques` | Controle de estoque, compras |
| Vendas | `crm` | CRM, pedidos, vendas |
| Finanças | `caixa` | Caixa, contas a pagar/receber |

### 2.2. Início (Sub-módulos)
| Item | URL | Descrição |
|------|-----|-----------|
| Índice | `index` | Página inicial |
| Dashboard | `dashboard` | KPIs de vendas, pedidos, NFs |
| Agenda | `home_agenda` | Calendário de compromissos |
| Minha conta | `dados_conta` | Dados da empresa |
| Integrações | `integracoes` | Marketplaces e APIs |
| Upgrade de plano | `contratacao_servico` | Gestão de assinatura |
| Sobre a versão | `detalhes_versao` | Info da versão do sistema |
| Ajuda do ERP | `ajuda/` | Central de ajuda |
| Ferramentas | `ferramentas_geral` | Utilitários do sistema |
| Loja de extensões | `loja_aplicativos` | Marketplace de plugins |
| Shopping de Serviços | `https://olist.com/parceiros` | Parceiros e serviços |

### 2.3. Ecosystem Rail (Barra lateral esquerda)
| Produto | URL | Descrição |
|---------|-----|-----------|
| ERP | `/` | ERP principal |
| PDV | `/pdv` | Ponto de Venda (loja física) |
| Conta Digital | `/conta_digital` | Conta bancária com PIX grátis |
| Envios | `/olist_envios` | Integração de envios/logística |
| Ecommerce | `/olist_ecommerce` | Plataforma de e-commerce |
| Lis | `https://agents.olist.com/chats/new/` | Assistente IA da Olist |

---

## 3. Módulo: CADASTROS

### 3.1. Clientes e Fornecedores
- **URL:** `contatos`
- **Tipos:** Cliente, Fornecedor, Transportador
- **Filtros:** Por data de cadastro, situação, tipo
- **Ações:** Incluir cadastro, ações em massa
- **Relatórios:** Relatórios de cadastros

### 3.2. Produtos
- **URL:** `estoques#/pesquisar-produtos`
- **Tipos de produto:** Simples, Kits, Matéria-prima
- **Campos:** SKU, nome, preço, custo, estoque, categoria, barcode
- **Ações:** Cadastro, edição, importação em massa

### 3.3. Campanhas Promocionais
- **URL:** provável `campanhas`
- **Descrição:** Gestão de promoções e descontos

### 3.4. Categorias dos Produtos
- **URL:** provável `categorias`
- **Descrição:** Hierarquia de categorias

### 3.5. Vendedores
- **Descrição:** Cadastro de vendedores/comissionamento

### 3.6. Embalagens
- **Descrição:** Tipos de embalagem para produtos

### 3.7. Relatórios (Cadastros)
- **URL:** provável `relatorios?&id=X`
- **Descrição:** Relatórios específicos de cadastros

---

## 4. Módulo: SUPRIMENTOS

### 4.1. Controle de Estoques
- **URL:** `estoques`
- **Funcionalidades:**
  - Pesquisa de produtos com filtros (tipo: simples/kits/matéria-prima)
  - Movimentações de entrada/saída
  - Ajustes de estoque
  - Transferência entre lojas/unidades
  - Inventário físico

### 4.2. Ordens de Compra
- **URL:** provável `ordens_compra`
- **Funcionalidades:**
  - Criação de OC
  - Aprovação de OC
  - Recebimento de mercadoria
  - Comparação OC vs nota fiscal

### 4.3. Serviços Tomados
- **URL:** provável `servicos_tomados`
- **Descrição:** Registro de serviços contratados

### 4.4. Notas de Entrada
- **URL:** provável `notas_entrada`
- **Descrição:** Entrada de notas fiscais de compra

### 4.5. Conferência de Compra
- **Descrição:** Conferência de pedidos de compra recebidos

### 4.6. Necessidades de Compra
- **Descrição:** Planejamento de compras baseado em estoque mínimo

### 4.7. Giro de Estoque
- **Descrição:** Análise de rotatividade de produtos

### 4.8. FCI (Forecast de Consumo de Inventário)
- **Descrição:** Previsão de demanda baseada em histórico

### 4.9. Relatórios (Suprimentos)
- **URL:** provável `relatorios?&id=X`
- **Descrição:** Relatórios de estoque e compras

---

## 5. Módulo: VENDAS (CRM)

### 5.1. CRM — Lista de Assuntos
- **URL:** `crm#list`
- **Funcionalidades:**
  - Pipeline de vendas (funil)
  - Assuntos/leads com status
  - Ações pendentes por assunto
  - Filtros avançados
  - Visualização de vendas por canal

### 5.2. Pedidos
- **Integração:** Dashboard mostra "vendas em e-commerce" vs "vendas físicas"
- **Origens:** Integrações com marketplaces (Shopee, Mercado Livre, etc.)

---

## 6. Módulo: FINANÇAS

### 6.1. Caixa
- **URL:** `caixa`
- **Funcionalidades:**
  - Saldo atual em tempo real
  - Pesquisar por cliente
  - Filtros por período
  - Transferir entre contas
  - Incluir lançamento manual
  - Mais ações (exportar, imprimir, etc.)
- **API:** `POST /services/caixa.server/2/CaixaListagem/{contar,listar}`
- **API:** `POST /services/caixa.server/2/FechamentoFinanceiro/FechamentoFinanceiro/obterDataDeFechamento`

### 6.2. Conta Digital
- **URL:** `conta_digital?utm=modulo`
- **Funcionalidades:**
  - PIX grátis
  - Saldo da conta
  - Extrato
  - Transferências
- **Branding:** "pix grátis" destacado

### 6.3. Parcelamento de Contas
- **URL:** `conta_digital_pagar_com_cartao`
- **Descrição:** Pagar contas parceladas com cartão de crédito

### 6.4. Contas a Pagar
- **URL:** `caixa#/contas_pagar`
- **Funcionalidades:**
  - Lançamento de contas a pagar
  - Categorização
  - Vencimento e pagamento
  - Conciliação bancária

### 6.5. Contas a Receber
- **URL:** `caixa#/contas_receber`
- **Funcionalidades:**
  - Lançamento de contas a receber
  - Cobrança
  - Recebimento e conciliação

### 6.6. Cobranças Bancárias
- **URL:** `cobrancas_registradas`
- **Descrição:** Boletos e cobranças registradas em banco

### 6.7. Extratos Bancários
- **URL:** `extratos_bancarios`
- **Funcionalidades:**
  - Integração com extrato bancário (bank file)
  - Conciliação automática

### 6.8. Relatórios Financeiros
- **URL:** `relatorios_sistema?id=5`
- **Descrição:** Relatórios financeiros variados

### 6.9. Painel de Contadores
- **URL:** `painel_contador`
- **Badge:** "Novo"
- **Descrição:** Área compartilhada com contador da empresa

---

## 7. Módulo: PDV (Ponto de Venda)

- **URL:** `/pdv`
- **Descrição:** Sistema de caixa para vendas presenciais
- **Funcionalidades esperadas:**
  - Carrinho de compras
  - Pagamento (dinheiro, cartão, PIX)
  - Cupom fiscal / NFC-e
  - Controle de caixa (abertura/fechamento)
  - busca por barcode

---

## 8. Módulo: NOTAS FISCAIS

- **URL:** `notas_fiscais`
- **Funcionalidades:**
  - Emissão de NF-e (Nota Fiscal Eletrônica)
  - NFS-e (Nota Fiscal de Serviço)
  - Consulta de status de envio
  - Integração com Shopee (aviso de instabilidade capturado)
- **Aviso do sistema:** "Instabilidade temporária na plataforma da Shopee impede envio automático de dados fiscais"

---

## 9. Módulo: DASHBOARD

- **URL:** `dashboard#/vendas`
- **KPIs exibidos:**
  - Total das vendas (gráfico de linha)
  - Ticket médio (gráfico de linha)
  - Pedidos (total)
  - Vendas em e-commerce (quantidade)
  - Vendas físicas (quantidade)
  - Valor total
  - NFs-e emitidas
  - Canal de venda em alta
- **Widgets:**
  - Pedidos por integrações
  - Pedidos por estado (mapa Brasil)
  - Funil de assuntos no CRM
  - Assuntos com ações pendentes
  - Produtos mais vendidos
  - Horários com mais vendas
  - Vendas X Devoluções
- **Dados temporais:** últimos 7 dias, filtros personalizáveis
- **APIs chamadas:**
  - `Dashboard\Dashboard/obterDadosVendas`
  - `Dashboard\Dashboard/obterDadosTotalizadorPedidos`
  - `Dashboard\Dashboard/obterQtdeNFesEmitidas`
  - `Dashboard\Dashboard/obterCanalVendaEmAlta`
  - `Dashboard\Dashboard/obterPedidosAgrupadosPorIntegracao`
  - `Dashboard\Dashboard/obterDadosVendasPorEstado`
  - `Dashboard\Dashboard/obterDadosFunilVendas`
  - `Dashboard\Dashboard/obterTabelaProdutosMaisVendidosDaEmpresa`
  - `Dashboard\Dashboard/obterDadosVendasPorHorario`
  - `Dashboard\Dashboard/obterDadosVendasVsDevolucoes`

---

## 10. Módulo: AGENDA

- **URL:** `home_agenda`
- **Funcionalidades:**
  - Calendário mensal/semanal/diário
  - Meus compromissos
  - Agendados para outros usuários
  - Notificações de compromissos

---

## 11. Módulo: INTEGRAÇÕES

- **URL:** `integracoes#/new`
- **Funcionalidades:**
  - Configurar marketplaces (Shopee, Mercado Livre, etc.)
  - Gerenciar integrações ativas
  - Autenticação OAuth para marketplaces
  - Sincronização de produtos/pedidos
  - Log de sincronização

---

## 12. MÓDULOS DO ECOSSISTEMA OLIST

### 12.1. Conta Digital
- **URL:** `conta_digital`
- **Destaque:** "PIX grátis"
- **Funcionalidades:** Conta bancária digital para e-commercer

### 12.2. Olist Envios
- **URL:** `olist_envios`
- **Descrição:** Gestão de envios e logística (integração com transportadoras)

### 12.3. Olist Ecommerce
- **URL:** `olist_ecommerce`
- **Descrição:** Plataforma de loja virtual

### 12.4. Lis (Lista de Integrações Shop)
- **URL:** `https://agents.olist.com/chats/new/`
- **Descrição:** Assistente de IA para Shopify

---

## 13. PLANOS E PREÇOS

| Plano | Preço/ano | Destaque |
|-------|-----------|----------|
| Avance | R$ 611,04 | Entrada |
| Construa | R$ 1.588,71 | Intermediário |
| Impulsion | R$ 3.466,29 | **Mais vendido** |
| Domine | R$ 8.421,30 | Avançado |
| Protagonize | Sob consulta | Enterprise |

**Benefícios:** 3 meses grátis em planos anuais/mensais, desconto de 17% no anual

---

## 14. CONFIGURAÇÕES DO SISTEMA

- **Configurações gerais:** `configuracoes_geral` (404 — URL pode ter mudado)
- **Dados da conta:** `dados_conta`
- **Integrações:** `integracoes`
- **Upgrade de plano:** `contratacao_servico`
- **Ajuda:** `ajuda/`
- **Ferramentas gerais:** `ferramentas_geral`
- **Loja de extensões:** `loja_aplicativos`

---

## 15. TOOLS E UTILITÁRIOS

- **Ferramentas gerais:** relatórios avançados, importação/exportação, configurações
- **Loja de extensões:** marketplace de plugins para o ERP
- **Shopping de serviços:** parceiros e serviços terceirizados
- **Canal de ideias:** feedback da comunidade
- **Indique e ganhe:** programa de referência

---

## 16. API BACKEND COMPLETA (Endpoints descobertos)

### Auth & Session
- `GET /services/auth.services.php?a=ping`
- `POST /services/multi.empresa.auth.services.php`

### Notifications
- `GET /services/notificacoes.services.php`

### Caixa/Financeiro
- `POST /services/caixa.server/2/CaixaListagem/contar`
- `POST /services/caixa.server/2/CaixaListagem/listar`
- `POST /services/caixa.server/2/Accounts\TokenAccounts/obterTokenAccounts`
- `POST /services/caixa.server/2/FechamentoFinanceiro\FechamentoFinanceiro/obterDataDeFechamento`

### CRM
- `POST /services/crm.server/1/listarCrm`
- `POST /services/crm.server/2/Accounts\TokenAccounts/obterTokenAccounts`

### Dashboard
- `POST /services/reforma.sistema.server/2/Dashboard\Dashboard/obterDadosVendas`
- `POST /services/reforma.sistema.server/2/Dashboard\Dashboard/obterDadosTotalizadorPedidos`
- `POST /services/reforma.sistema.server/2/Dashboard\Dashboard/obterQtdeNFesEmitidas`
- `POST /services/reforma.sistema.server/2/Dashboard\Dashboard/obterCanalVendaEmAlta`
- `POST /services/reforma.sistema.server/2/Dashboard\Dashboard/obterPedidosAgrupadosPorIntegracao`
- `POST /services/reforma.sistema.server/2/Dashboard\Dashboard/obterDadosVendasPorEstado`
- `POST /services/reforma.sistema.server/2/Dashboard\Dashboard/obterDadosFunilVendas`
- `POST /services/reforma.sistema.server/2/Dashboard\Dashboard/obterTabelaProdutosMaisVendidosDaEmpresa`
- `POST /services/reforma.sistema.server/2/Dashboard\Dashboard/obterDadosVendasPorHorario`
- `POST /services/reforma.sistema.server/2/Dashboard\Dashboard/obterDadosVendasVsDevolucoes`
- `POST /services/reforma.sistema.server/2/DashboardVendaWidgetConfig/obterConfigEmpresa`

### Billing/Contract
- `POST /services/reforma.sistema.server/2/Accounts\TokenAccounts/obterTokenAccounts`
- `POST /services/reforma.sistema.server/2/AtivacaoContrato/carregarConfig`
- `POST /services/reforma.sistema.server/2/Plano\Plano/obterPlanosParaExibicao`
- `POST /services/reforma.sistema.server/2/Plano\Upgrade/obterInfoConta`
- `POST /services/reforma.sistema.server/2/AtivacaoContrato/obterConfiguracaoPagamento`
- `POST /services/reforma.sistema.server/2/CobrancasTiny\FormaPagamentoMensalidade/obterDadosCartaoCredito`
- `POST /services/reforma.sistema.server/2/CobrancasTiny\Checkout/obterDadosResumoCheckoutTimeline`
- `POST /services/reforma.sistema.server/2/CodigoPromocional/obterCodigoPromocional`
- `POST /services/reforma.sistema.server/2/Plano\Plano/obterPlanoPorNome`
- `POST /services/reforma.sistema.server/2/Plano\Plano/obterValoresPlanosCupom`
- `POST /services/reforma.sistema.server/2/Plano\Plano/obterDadosCodigoPromocional`
- `POST /services/reforma.sistema.server/2/CobrancasTiny\FormaPagamentoMensalidade/obterRecaptchaV3SiteKey`
- `POST /services/reforma.sistema.server/2/CobrancasTiny\Checkout/obterDadosResumoCheckoutTimeline`
- `POST /services/reforma.sistema.server/2/CobrancasTiny\AvisoCobranca/obterAvisoInadimplencia`

---

*Documento gerado por engenharia reversa em 2026-10-28 via Playwright MCP + captura de rede*
