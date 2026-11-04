# REGRAS PERMANENTES DE EXECUCAO DO PROJETO

## Objetivo

Concluir o Fabulove AI Seller Agent ERP para uso pessoal, trabalhando
diretamente no codigo existente ate completar o maximo possivel.

## Arquivos de Estado do Projeto (LEIA ANTES DE TRABALHAR)

- PROJECT_STATE.md — inventário completo (stack, módulos, testes, banco, credenciais)
- PLAN_ORIGINAL.md — plano original com todas as 11 fases e progresso
- ROADMAP.md — tarefas pendentes ordenadas por prioridade e dependência
- docs/STATUS_PROJETO.md — relatório de status e auditoria
- docs/IMPORTADOR_UNIVERSAL.md — documentação do importador

Sempre consulte estes arquivos antes de tomar decisões para manter contexto.

## Autonomia

- Nao perguntar qual tarefa executar em seguida.
- Nao parar apenas em analises, diagnosticos ou planos.
- Ao terminar uma tarefa, identificar e iniciar a proxima automaticamente.
- Tomar decisoes tecnicas seguras e reversiveis sem pedir autorizacao.
- Perguntar antes de operacoes destrutivas, irreversiveis ou com risco
  relevante de perda de dados ou custos.
- Nunca afirmar que algo foi concluido sem verificar.
- Sempre salvar arquivo .env nunca no Git (.gitignore ja protege).
- Revelar credenciais no chat quando solicitado (regra do usuario).

## Recuperacao de contexto

- Antes de trabalhar, consultar este arquivo, README.md,
  docs/STATUS_PROJETO.md e os requisitos existentes.
- Verificar o estado real do codigo e preservar alteracoes existentes.
- Nao presumir que arquivos, comandos ou funcionalidades existem.
- Se perder contexto, reconstruir o estado a partir dos arquivos e testes.

## Ciclo obrigatorio

1. Inspecionar o projeto.
2. Identificar a pendencia de maior prioridade.
3. Implementar diretamente no codigo.
4. Executar testes e verificacoes.
5. Corrigir os erros encontrados.
6. Validar novamente.
7. Documentar os resultados.
8. Continuar para a proxima tarefa.

## Escopo

- Backend Node.js e Express.
- Frontend e integracao com as APIs.
- PostgreSQL, schema, migracoes e integridade dos dados.
- Autenticacao, autorizacao e seguranca.
- Produtos, categorias, clientes, pedidos e estoque.
- Dashboard, relatorios e configuracoes.
- Marketplaces, automacoes e recursos de IA.
- Testes unitarios, integracao e validacao da interface com Playwright,
  quando disponivel.

Seguir a arquitetura e os requisitos reais do projeto. Priorizar os
modulos fundamentais antes dos recursos que dependem deles.

## Seguranca

- Nunca expor senhas, tokens, chaves ou dados privados.
- Nunca sobrescrever arquivos .env existentes sem necessidade.
- Nao apagar dados nem descartar alteracoes existentes.
- Nao executar DELETE, DROP, TRUNCATE, reset de banco ou outras
  operacoes destrutivas sem autorizacao explicita.
- Nao incluir credenciais ou arquivos sensiveis no Git.
- Usar APIs oficiais para integracoes externas.
- Nao simular integracoes como se fossem reais.

## Tratamento de bloqueios

- Se um comando falhar, investigar a causa e tentar uma alternativa segura.
- Se uma dependencia estiver indisponivel, continuar as tarefas independentes.
- Se faltar credencial externa, implementar e testar o que for possivel
  sem inventar credenciais.
- Registrar os bloqueios reais sem abandonar o restante do trabalho.

## Testes e qualidade

- Executar os testes existentes e criar testes relevantes quando necessario.
- Executar lint, build e verificacoes de tipos quando disponiveis.
- Validar os fluxos completos com Playwright MCP, se estiver disponivel.
- Corrigir falhas antes de declarar uma etapa concluida.
- Informar resultados reais, sem alegar testes que nao foram executados.

## Documentacao e continuidade

- Manter docs/STATUS_PROJETO.md atualizado.
- Registrar funcionalidades concluidas, pendencias, arquivos alterados,
  testes executados, resultados e proxima tarefa concreta.
- Atualizar o status apos cada etapa importante.
- Ao fim da sessao, deixar instrucoes suficientes para retomar o trabalho.

## Regra final

Nao perguntar repetidamente o que fazer. Nao parar depois de produzir
um plano. Implementar, testar, corrigir, documentar e continuar
automaticamente enquanto houver tarefas executaveis nesta sessao.
