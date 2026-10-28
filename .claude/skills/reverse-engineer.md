# Skill: reverse-engineer

## Descrição
Realizar engenharia reversa de sistemas externos para mapear funcionalidades e arquitetura.

## Quando usar
- Ao analisar concorrentes
- Ao entender APIs não documentadas
- Para criar mapas de funcionalidades

## Ferramentas
- Playwright MCP (navegação browser)
- REA (reverse engineering) MCP
- Capture de rede (network requests)
- JavaScript evaluation no browser

## Passos
1. Acessar o sistema alvo via browser autenticado
2. Navegar por todas as seções/módulos
3. Capturar URLs e endpoints de API
4. Extrair textos, menus e estruturas de dados
5. Analisar bundles JavaScript (se possível)
6. Consolidar em documento de feature map
7. Comparar com sistema existente (gap analysis)

## Saídas esperadas
- Feature Map completo (como OLIST_FEATURE_MAP.md)
- Gap Analysis (como OLIST_GAP_ANALYSIS.md)
- Lista de endpoints API descobertos
