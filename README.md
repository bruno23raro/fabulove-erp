# Fabulove AI Seller Agent - ERP

Sistema ERP completo para automação de e-commerce com IA integrada.

## 🚀 Funcionalidades

- **Dashboard**: Visão geral de vendas, estoque e performance
- **Produtos**: Cadastro, gestão de estoque e precificação automatizada
- **Catálogo**: Geração automática de títulos, descrições e atributos
- **Criativos**: Criação de imagens e vídeos com IA
- **Marketplaces**: Integração com Shopee, Mercado Livre e TikTok Shop
- **Relatórios**: Analytics completo de vendas e performance

## 🛠️ Tecnologias

- **Frontend**: Vue 3 + Vite + Chart.js
- **Backend**: Node.js + Express
- **Banco**: PostgreSQL
- **IA**: OpenAI API (GPT-4, DALL-E)
- **Automação**: Workflows automatizados

## 📦 Instalação

1. Clone o repositório
2. Instale as dependências:
```bash
npm install
```

3. Configure o banco de dados:
```bash
# Copie o arquivo de exemplo
cp .env.example .env

# Configure suas credenciais no .env
```

4. Execute as migrações:
```bash
npm run db:migrate
```

5. Popule com dados de exemplo:
```bash
npm run db:seed
```

6. Inicie o servidor:
```bash
npm run dev
```

## 🏗️ Estrutura do Projeto

```
fabulove-erp/
├── client/                 # Frontend Vue.js
│   ├── src/
│   │   ├── components/     # Componentes reutilizáveis
│   │   ├── views/         # Páginas principais
│   │   ├── router/        # Configuração de rotas
│   │   └── stores/        # Gerenciamento de estado
├── server/                # Backend Node.js
│   ├── controllers/       # Lógica de negócio
│   ├── models/           # Modelos do banco
│   ├── routes/           # Definição de rotas
│   ├── middleware/       # Middlewares
│   └── scripts/          # Scripts de migração/seed
└── docs/                 # Documentação
```

## 🔄 Fluxo Principal

1. **Importação**: Upload de NF-e ou cadastro manual
2. **Precificação**: Aplicação automática de regras de preço
3. **Catálogo**: Geração de títulos e descrições otimizadas
4. **Criativos**: Criação de imagens e vídeos promocionais
5. **Publicação**: Envio automático para marketplaces
6. **Monitoramento**: Acompanhamento de vendas e performance

## 📊 Módulos

### Dashboard
- KPIs de vendas, lucro e estoque
- Gráficos de performance
- Alertas e notificações

### Produtos
- Cadastro completo com fotos
- Controle de estoque
- Precificação baseada em regras
- Histórico de alterações

### Catálogo
- Títulos otimizados para SEO
- Descrições persuasivas
- Atributos automáticos
- Preview em tempo real

### Criativos
- Geração de imagens com IA
- Criação de vídeos promocionais
- Templates personalizáveis
- Biblioteca de assets

### Marketplaces
- Integração com APIs
- Sincronização de estoque
- Gestão de pedidos
- Relatórios por canal

## 🤖 Automação com IA

- **OCR**: Extração de dados de NF-e
- **Precificação**: Cálculo automático baseado em margem
- **SEO**: Títulos otimizados para busca
- **Imagens**: Geração de fotos profissionais
- **Vídeos**: Criação de conteúdo para TikTok Shop
- **Análise**: Insights de performance e sugestões

## 🔧 Configuração

### Regras de Precificação
```
Preço de Venda = (Custo + 6) × 1.186 + 4.71
```

### Integração com Marketplaces
- Shopee: Via API oficial
- Mercado Livre: Via API REST
- TikTok Shop: Via TikTok for Business

## 📈 Roadmap

- [ ] Módulo de importação de NF-e
- [ ] Integração com IA para imagens
- [ ] Publicação automática no Shopee
- [ ] Dashboard de analytics
- [ ] Sistema de notificações
- [ ] Backup automático
- [ ] App mobile

## 📄 Licença

MIT License - veja o arquivo LICENSE para detalhes.