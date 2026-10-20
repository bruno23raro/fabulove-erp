# Importador Universal de Produtos — Fabulove ERP

## Visão Geral

Sistema completo de importação de produtos multi-formato integrado ao Fabulove ERP.
Detecta automaticamente o formato do arquivo, reconhece colunas por correspondência fuzzy,
permite mapeamento manual e processa em lotes com políticas de duplicatas configuráveis.

## Formatos Suportados

| Formato | Extensões | Parser |
|---------|-----------|--------|
| CSV/TSV | `.csv`, `.tsv`, `.txt` | PapaParse (auto-delimiter, UTF-8/Bronz/Latex) |
| Excel | `.xlsx`, `.xls` | SheetJS (xlsx) |
| JSON | `.json`, `.jsonl`, `.ndjson` | JSON.parse (array ou linha por linha) |
| XML | `.xml` | fast-xml-parser (containers aninhados) |
| ZIP | `.zip` | JSZip (extrai CSV/JSON interno) |

## Endpoints da API

### `POST /api/products/import/analyze`
Analisa o arquivo e retorna estrutura detectada + sugestão de mapeamento.

```http
POST /api/products/import/analyze
Content-Type: multipart/form-data

file: <arquivo>
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "format": "csv",
    "formatLabel": "CSV",
    "headers": ["barcode", "nome", "preco"],
    "totalRows": 150,
    "headerAnalysis": [
      { "header": "barcode", "mappedField": "barcode", "confidence": 1.0 },
      { "header": "nome", "mappedField": "name", "confidence": 1.0 },
      { "header": "preco", "mappedField": "price", "confidence": 0.85 }
    ],
    "preview": [{ "barcode": "789...", "nome": "...", "preco": "25.50" }],
    "fieldPresence": { "name": { "count": 150, "sampleValues": [...] } },
    "suggestedMapping": { "name": "nome", "barcode": "barcode", "price": "preco" }
  }
}
```

### `POST /api/products/import`
Importa produtos com mapeamento explícito.

```http
POST /api/products/import
Content-Type: multipart/form-data

file: <arquivo>
mapping: '{"name":"nome","barcode":"codigo_barras"}'  (JSON string)
duplicatePolicy: "skip" | "create" | "update" | "review"
batchSize: 500
skipValidation: false
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "format": "csv",
    "stats": {
      "created": 12,
      "updated": 3,
      "skipped": 5,
      "errors": 0,
      "totalRows": 20
    },
    "errorList": []
  }
}
```

### `GET /api/products/import/profiles`
Lista perfis de importação salvos pelo usuário.

### `POST /api/products/import/profiles`
Salva um perfil reutilizável de mapeamento.

```json
{ "name": "Fornecedor ABC", "description": "Catálogo semanal", "mapping": {"name": "nome", "price": "preco_venda"} }
```

### `DELETE /api/products/import/profiles/:id`
Remove um perfil salvo.

## Arquitetura (Backend)

```
server/services/import/
├── index.js          — Re-exporta tudo, registra formatos via side-effects
├── import.service.js — Orquestra o pipeline completo
├── analyzer.js       — Detecta formato, analisa headers, gera preview
├── mapper.js         — Reconhecimento fuzzy de colunas + normalização
├── validator.js      — Validação + detecção de duplicatas (BD)
├── normalizer.js     — Converte strings para tipos (preço, qty, barcode)
└── formats/
    ├── base.js       — Registry de formatos + detectFormat()
    ├── csv.js        — PapaParse + auto-delimiter + multi-encoding
    ├── xlsx.js       — SheetJS (planilha ativa)
    ├── json.js       — JSON array ou NDJSON
    ├── xml.js        — fast-xml-parser + recursive unwrap
    └── zip.js        — JSZip + security scan (path traversal, macros)
```

### Pipeline de Importação

```
1. File Upload → Multer (memory, 100MB max, fileFilter whitelist)
2. Format Detection → extension + magic bytes (FIDO algorithm)
3. Parse → format-specific parser (CSV/XLSX/JSON/XML/ZIP)
4. Analyze → header recognition (fuzzy matching, confidence scoring)
5. Validate → required fields, type checks, barcode normalization
6. Duplicate Check → DB query by barcode/SKU (concurrent)
7. Apply Policy → skip / create / update / review
8. Upsert → batch transactions (configurable batch size)
9. Report → stats + error list
```

## UI — Wizard de 4 Etapas

O modal de importação no ProductsView.vue segue um fluxo em 4 passos:

1. **Upload** — Dropzone com drag-and-drop, auto-análise do arquivo
2. **Mapeamento** — Tabela de colunas com scores de confiança, campos opcionais marcados, preview das 5 primeiras linhas
3. **Opções** — Política de duplicatas, tamanho do lote, salvamento de perfil
4. **Resultado** — Cards com criados/atuizados/ignrados, erros expansíveis

### Reconhecimento de Colunas

O mapper usa `similarity()` (char-overlap ratio) contra aliases conhecidos:

| Campo | Aliases principais |
|-------|-------------------|
| name | nome, product, titulo, article... |
| barcode | codigo_barras, ean, gtin, upc... |
| price | preco, valor, venda, sale_price... |
| stock | estoque, quantidade, qty, inventory... |
| category | categoria, grupo, family... |
| brand | marca, fabricante, manufacturer... |

Confiança < 0.45 = não mapeado. Campo obrigatório sem mapeamento = erro.

## Normalizações

| Campo | Regras |
|-------|--------|
| price | Remove R$/$. Suporta 1.234,56 (BR) e 1,234.56 (INT) |
| stock | Arredonda para inteiro. Same separator logic |
| barcode | Strip separators, valida 8-14 dígitos |
| string | Trim, NFKC normalize, strip accents |

## Segurança

- **File upload**: Multer memory storage, 100MB limit, whitelist de extensões via `fileFilter`
- **ZIP**: Path traversal check (`../` blocks), dangerous file extensions blocked (`.exe`, `.js`, `.vbs`), macro detection
- **Input validation**: Backend re-validates all data regardless of frontend mapping
- **No destructive ops**: No DROP/TRUNCATE/DELETE bulk in any import path
- **Error handling**: All parser errors caught and returned as user-friendly messages in PT-BR
- **Rate limiting**: Standard auth middleware applies; import endpoints require admin/manager role

## Testes

### Unitários (`server/tests/import.universal.test.js`)
- **43 testes** — format detection, parsing (CSV/XLSX/JSON/XML/ZIP), normalization, mapping, validation, duplicate resolution, error cases
- Mock de `pg` pool via `vi.mock()`
- Cobertura de edge cases: headers unknown, empty rows, single row, duplicate barcodes

### E2E (`server/tests/import.e2e.cjs`)
- **15 endpoints** testados via servidor real
- `POST /api/products/import/analyze` → 200, returns structure
- `POST /api/products/import` → 201, creates products
- `GET /api/products/import/profiles` → 200
- `POST /api/products/import/profiles` → 201
- Error cases: missing file, invalid format, missing required field

### Regressão (`npm test`)
- **75 testes** passando — todos os testes existentes do ERP intactos

## Como Usar

1. Ir para **Produtos** → botão "📥 Importar Produtos"
2. Arrastar ou selecionar arquivo (CSV/XLSX/JSON/XML/ZIP)
3. O sistema detecta formato e mapeia colunas automaticamente
4. Ajustar mapeamento se necessário (selecionar campo correto por coluna)
5. Configurar política de duplicatas e tamanho do lote
6. Clicar "🚀 Iniciar Importação"
7. Ver resultado com estatísticas e erros (se houver)

## Performance

- Lotes de até 500 registros por transação (configurável)
- Upsert em batch com `COPY`-like semantics via INSERT ... ON CONFLICT
- Análise limitada a 500 linhas (preview mostra 20)
- Timeout de parser: 30s por arquivo
- Suporta arquivos até 100MB
