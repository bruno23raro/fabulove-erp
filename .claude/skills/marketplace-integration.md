# Skill: marketplace-integration

## Descrição
Implementar integração com novos marketplaces (Mercado Livre, TikTok Shop, Amazon, etc.).

## Quando usar
- Ao adicionar novo marketplace
- Ao corrigir integração existente
- Ao expandir sincronização

## Passos
1. Pesquisar documentação da API do marketplace
2. Implementar OAuth 2.0 (se aplicável)
3. Criar service para o marketplace
4. Criar controller e routes
5. Mapear campos entre marketplace e ERP
6. Implementar sync de produtos e pedidos
7. Adicionar testes
8. Documentar em docs/

## Precauções
- Nunca simular integrações como reais
- Usar credenciais reais apenas em ambiente de teste
- Tratar rate limits adequadamente
- Logar todas as operações
