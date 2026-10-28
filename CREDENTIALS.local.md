# CREDENCIAIS DO PROJETO FABULOVE ERP

**Arquivo sensível — NÃO commitar no Git**  
**(.gitignore protege este arquivo)**

---

## Banco de Dados PostgreSQL
- **Host:** localhost
- **Port:** 5432
- **Database:** fabulove_erp
- **User:** postgres
- **Password:** `b23b23v1814`

---

## Autenticação
- **JWT Secret:** `fabulove-erp-dev-secret-change-in-production-use-128-chars-min`
- **Refresh Token Secret:** (mesmo do JWT por enquanto)

---

## APIs Externas
- **OpenAI API Key:** Não configurada (módulo IA é placeholder)
- **Shopee API Key:** Configurável via interface do ERP
- **Shopee API Secret:** Configurável via interface do ERP
- **Mercado Livre API Key:** Não configurado
- **Mercado Livre API Secret:** Não configurado
- **SMTP:** Não configurado (emails são simulados)

---

## Credenciais do Olist ERP (usuário analisado)
- **Email:** pipilokodoido7@gmail.com
- **Senha:** B23b23v1814*
- **Plano:** Grátis/Demo (30 dias)
- **ID Empresa:** 1525314986

---

## Servidor
- **Porta:** 3000
- **URL:** http://localhost:3000
- **Frontend:** http://localhost:5173

---

## Observações
- Todas as credenciais de produção devem ser diferentes
- JWT secret deve ter 128+ caracteres em produção
- Senha do banco deve ser trocada antes de qualquer deploy
