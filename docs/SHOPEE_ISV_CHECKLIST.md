# Shopee ISV Checklist — Fabulove ERP

## Empresa

- **Razão Social**: BRUNO ALMEIDA RODRIGUES DA SILVA
- **CNPJ**: 62.628.065/0001-33
- **Nome Fantasia**: SIZEN ERP
- **Endereço**: Roosevelt 259/Apucarana/86810110
- **CEP**: 86810-110
- **País**: Brasil

## Contato

- **Telefone**: +55 43 99935-2149
- **Responsável**: BRUNO ALMEIDA RODRIGUES DA SILVA
- **Email Corporativo**: bruno.almeida@fabulove.com (recomendado)
- **Email Secundario**: bruno@fabulove.com.br

## Aviso Importante

- **Gmail pessoal é frágil** para requisitos corporativos de validação
- **Marca única**: SIZEN (definida no CLAUDE.md) — nome fantasia alinhado
- **CNPJ em PDF único** ≤ 10MB (imagem scan ou PDF gerado)
- **E-mail corporativo** recomendado em vez de Gmail pessoal

## Campos do Cadastro ISV Shopee Open Platform

| Campo                 | Valor                                   | Observações                             |
| --------------------- | --------------------------------------- | --------------------------------------- |
| **Razão Social**      | Bruno Almeida Silva                     | Exatamente como no CNPJ                 |
| **CNPJ**              | 62.628.065/0001-33                      | Somente números e pontuação             |
| **Nome Fantasia**     | SIZEN ERP                               | Pode diferir da razão social            |
| **Endereço**          | Roosevelt 259, Apucarana, PR, 86810-110 | Logradouro, número, cidade, estado, CEP |
| **Telefone**          | +55 43 99935-2149                       | Com código de país e DDD                |
| **Email Responsável** | bruno.almeida@fabulove.com              | E-mail de contato oficial               |
| **Email Secundario**  | bruno@fabulove.com.br                   | Opcional, para suporte                  |
| **Site/Website**      | https://fabulove-erp.vercel.app         | Opcional                                |

## Redirect URI Preciso para Cadastro

```
https://fabulove-erp.vercel.app/api/marketplace/shopee/callback
```

**Obrigatório cadastrar esta URI exata** no painel do desenvolvedor da Shopee.

## Webhook Preciso para Cadastro

```
https://fabulove-erp.vercel.app/api/marketplace/shopee/webhook
```

**Obrigatório configurar este webhook** no painel do desenvolvedor da Shopee.

## .env.example com Credenciais Shopee

```env
# Shopee Open Platform
SHOPEE_PARTNER_ID=123456          # Partner ID do app cadastrado
SHOPEE_PARTNER_KEY=abcdefghijkl  # Partner Key do app cadastrado
SHOPEE_REDIRECT_URI=https://fabulove-erp.vercel.app/api/marketplace/shopee/callback
SHOPEE_ENV=production              # sandbox | production

# Validação no boot (sistema falha startup se estiverem vazios em produção)
# Verificar: server/config/guards.js -> assertRequiredEnv
```

## Formato do Relatório de Pentest

- **PDF ≤ 60MB**
- **Estrutura**: SECURITY.md + pentest/collection.json + RELATORIO_MODELO.md
- **Assinatura**: Testador deve preencher e assinar a seção final
- **Entrega**: Pacote zip contendo todos os arquivos acima

## Endpoints Críticos (para teste de pentest)

| Endpoint                         | Method | Descrição                           |
| -------------------------------- | ------ | ----------------------------------- |
| `/api/auth/login`                | POST   | Autenticação de usuário             |
| `/api/auth/register`             | POST   | Registro de novo usuário            |
| `/api/marketplaces/mock/webhook` | POST   | Webhook mock (teste HMAC)           |
| `/api/marketplaces/mock/auth`    | POST   | Conexão adapter mock                |
| `/api/health`                    | GET    | Health check (headers de segurança) |

## Checklist de Segurança (marcar ao finalizar)

- [ ] HMAC validation em webhooks (401 sem assinatura)
- [ ] Rate limit em auth (20 req/15min)
- [ ] Rate limit em API (300 req/15min)
- [ ] Headers de segurança (helmet: CSP, HSTS, X-Content-Type-Options)
- [ ] CORS restrito ao domínio do app
- [ ] Validação/sanitização de inputs
- [ ] Token/secret nunca em log/resposta de erro
- [ ] npm audit: crítico/alto resolvidos
- [ ] Build OK + lint clean
- [ ] TESTES VERDES (136 passing + 8 skipped)
- [ ] SECURITY.md preenchido
- [ ] pentest/collection.json criado
- [ ] docs/SHOPEE_ISV_CHECKLIST.md criado
- [ ] .env.example criado com credenciais

## O que NÃO Deve Ser Enviado ao Portal

- Credenciais reais (partner_key, partner_secret) no chat/documento
- Endpoints Shopee fora da documentação oficial
- Hardcoded secrets no código-fonte
- Afirmação de "pentest feito" — o pacote é entregue para terceiros assinarem
- ✅ Divergência resolvida: nome Fantasia (SIZEN ERP) alinhado com marca SIZEN

---

**Gereado em**: 2026-10-29
**Empresa**: Bruno Almeida Silva - CNPJ 62.628.065/0001-33
**Aplicação**: SIZEN ERP - https://fabulove-erp.vercel.app
