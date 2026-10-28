# Skill: test-and-validate

## Descrição
Executar testes e validações para garantir qualidade do código.

## Quando usar
- Antes de fazer deploy
- Após implementar nova funcionalidade
- Ao corrigir bugs
- Periodicamente para manter qualidade

## Passos
1. Executar testes unitários: `npm run test`
2. Executar testes E2E: `npm run test:e2e`
3. Verificar se há testes quebrados
4. Corrigir falhas encontradas
5. Validar build frontend: `npm run build`
6. Verificar se todas as rotas estão acessíveis
7. Atualizar docs/STATUS_PROJETO.md com resultados

## Métricas
- 97 testes unitários (vitest)
- 28 testes E2E (supertest)
- Build Vite deve passar sem erros
- Todas as rotas devem responder com 200 ou auth-required
