/**
 * Comprehensive tests for the Universal Product Import System
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mkdirSync, existsSync } from 'fs'

// Mock database
const mockPoolQuery = vi.fn()
vi.mock('../config/database.js', () => ({
  default: { query: mockPoolQuery, connect: vi.fn() },
}))

// Mock logger
vi.mock('../utils/logger.js', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

// Import services
const { analyzeFile } = await import('../services/import/analyzer.js')
const { ImportService } = await import('../services/import/import.service.js')
const { analyzeHeaders, mapColumns, normalizeRow, getTargetFields } = await import('../services/import/mapper.js')
const { normalizeString, normalizePrice, normalizeQuantity, normalizeBarcode } = await import('../services/import/normalizer.js')
const { ImportValidator } = await import('../services/import/validator.js')
const { detectFormat } = await import('../services/import/formats/base.js')

// Register all format handlers (side-effect imports)
await import('../services/import/formats/csv.js')
await import('../services/import/formats/xlsx.js')
await import('../services/import/formats/json.js')
await import('../services/import/formats/xml.js')
await import('../services/import/formats/zip.js')

const TEST_DIR = 'server/tests/import-fixtures'
if (!existsSync(TEST_DIR)) mkdirSync(TEST_DIR, { recursive: true })

function makeCsv(content) { return Buffer.from(content, 'utf-8') }

// ─── Normalizer Tests ────────────────────────────────────────────────────────
describe('Normalizer', () => {
  it('normalizeString trims and handles nulls', () => {
    expect(normalizeString(null)).toBeNull()
    expect(normalizeString('')).toBeNull()
    expect(normalizeString('  hello  ')).toBe('hello')
    expect(normalizeString(123)).toBe('123')
  })

  it('normalizePrice — Brazilian format 1.234,56', () => {
    expect(normalizePrice('1.234,56')).toBe(1234.56)
    expect(normalizePrice('R$ 1.234,56')).toBe(1234.56)
    expect(normalizePrice('$ 1.234,56')).toBe(1234.56)
  })

  it('normalizePrice — International format 1,234.56', () => {
    expect(normalizePrice('1,234.56')).toBe(1234.56)
    expect(normalizePrice('$1,234.56')).toBe(1234.56)
  })

  it('normalizePrice — plain numbers', () => {
    expect(normalizePrice('25.5')).toBe(25.5)
    expect(normalizePrice('100')).toBe(100)
    expect(normalizePrice('0')).toBe(0)
  })

  it('normalizePrice — invalid returns null', () => {
    expect(normalizePrice('abc')).toBeNull()
    expect(normalizePrice('')).toBeNull()
    expect(normalizePrice(null)).toBeNull()
  })

  it('normalizeQuantity — various formats', () => {
    expect(normalizeQuantity('100')).toBe(100)
    expect(normalizeQuantity('1.234,56')).toBe(1235)
    expect(normalizeQuantity('1,234')).toBe(1234)
    expect(normalizeQuantity('')).toBeNull()
    expect(normalizeQuantity(null)).toBeNull()
  })

  it('normalizeBarcode — preserves leading zeros', () => {
    expect(normalizeBarcode('07891234567890')).toBe('07891234567890')
    expect(normalizeBarcode('789-1234-567890')).toBe('7891234567890')
    expect(normalizeBarcode('  7891234567890  ')).toBe('7891234567890')
    expect(normalizeBarcode('invalid!')).toBeNull()
    expect(normalizeBarcode('')).toBeNull()
  })
})

// ─── Mapper Tests ────────────────────────────────────────────────────────────
describe('Column Mapper', () => {
  it('maps common Portuguese headers', () => {
    const headers = ['Nome', 'SKU', 'Código de Barras', 'Preço', 'Estoque', 'Categoria']
    const analysis = analyzeHeaders(headers)
    // Build map: field -> header (each field appears once due to usedFields dedup)
    const byField = {}
    for (const a of analysis) {
      if (a.mappedField) byField[a.mappedField] = a.header
    }
    expect(byField.name).toBe('Nome')
    expect(byField.sku).toBe('SKU')
    expect(byField.barcode).toBe('Código de Barras')
    expect(byField.price).toBe('Preço')
    expect(byField.stock).toBe('Estoque')
    expect(byField.category).toBe('Categoria')
  })

  it('maps English headers', () => {
    const headers = ['Product Name', 'SKU', 'Barcode', 'Price', 'Stock', 'Category']
    const analysis = analyzeHeaders(headers)
    const byField = {}
    for (const a of analysis) {
      if (a.mappedField) byField[a.mappedField] = a.header
    }
    expect(byField.name).toBe('Product Name')
    expect(byField.barcode).toBe('Barcode')
    expect(byField.price).toBe('Price')
  })

  it('maps mixed-language headers', () => {
    const headers = ['Produto', 'Codigo_barras', 'Preco_venda', 'Qtd_estoque']
    const analysis = analyzeHeaders(headers)
    const byField = {}
    for (const a of analysis) {
      if (a.mappedField) byField[a.mappedField] = a.header
    }
    expect(byField.name).toBe('Produto')
    expect(byField.barcode).toBe('Codigo_barras')
    expect(byField.price).toBe('Preco_venda')
    expect(byField.stock).toBe('Qtd_estoque')
  })

  it('mapColumns accepts string header names', () => {
    const headers = ['Nome', 'SKU', 'Preço', 'Estoque', 'Categoria']
    const mapping = { name: 'Nome', sku: 'SKU', price: 'Preço', stock: 'Estoque', category: 'Categoria' }
    const result = mapColumns(headers, mapping)
    expect(result.fields).toHaveLength(5)
    expect(result.fieldMapping[0].field).toBe('name')
    expect(result.fieldMapping[0].index).toBe(0)
  })

  it('normalizeRow maps values correctly', () => {
    const headers = ['Nome', 'SKU', 'Preço', 'Estoque', 'Categoria']
    const rawRow = ['Camiseta Premium', 'CAM-001', '49.90', '50', 'Roupas']
    const mapping = [
      { field: 'name', header: 'Nome', index: 0 },
      { field: 'sku', header: 'SKU', index: 1 },
      { field: 'price', header: 'Preço', index: 2 },
      { field: 'stock', header: 'Estoque', index: 3 },
      { field: 'category', header: 'Categoria', index: 4 },
    ]
    const product = normalizeRow(rawRow, mapping)
    expect(product.name).toBe('Camiseta Premium')
    expect(product.sku).toBe('CAM-001')
    expect(product.price).toBe(49.90)
    expect(product.stock).toBe(50)
    expect(product.category).toBe('Roupas')
  })

  it('handles unknown column names gracefully', () => {
    const headers = ['Zyx', 'Xjz', 'Wqp']
    const analysis = analyzeHeaders(headers)
    for (const a of analysis) {
      expect(a.mappedField).toBeNull()
      expect(a.confidence).toBeLessThan(0.5)
    }
  })
})

// ─── CSV Format Tests ────────────────────────────────────────────────────────
describe('CSV Format', () => {
  it('parses comma-separated CSV', async () => {
    const buffer = makeCsv('barcode,name,price\n123,Product A,10.50\n456,Product B,20.00')
    const fmt = detectFormat(buffer, 'test.csv')
    expect(fmt).not.toBeNull()
    const result = await fmt.parse(buffer)
    expect(result.headers).toEqual(['barcode', 'name', 'price'])
    expect(result.rows).toHaveLength(2)
    expect(result.rows[0]).toEqual(['123', 'Product A', '10.50'])
  })

  it('parses semicolon-separated CSV', async () => {
    const buffer = makeCsv('barcode;name;price\n123;Product A;10.50\n456;Product B;20.00')
    const fmt = detectFormat(buffer, 'test.csv')
    expect(fmt).not.toBeNull()
    const result = await fmt.parse(buffer)
    expect(result.headers).toEqual(['barcode', 'name', 'price'])
    expect(result.rows).toHaveLength(2)
  })

  it('parses tab-separated CSV', async () => {
    const buffer = makeCsv('barcode\tname\tprice\n123\tProduct A\t10.50')
    const fmt = detectFormat(buffer, 'test.tsv')
    expect(fmt).not.toBeNull()
    const result = await fmt.parse(buffer)
    expect(result.headers).toEqual(['barcode', 'name', 'price'])
  })

  it('handles quoted fields with embedded separators', async () => {
    const buffer = makeCsv('barcode,name,description\n123,"Product, with commas","A \"quoted\" description"')
    const fmt = detectFormat(buffer, 'test.csv')
    const result = await fmt.parse(buffer)
    expect(result.rows[0][1]).toBe('Product, with commas')
    expect(result.rows[0][2]).toBe('A "quoted" description')
  })

  it('handles CSV with BOM', async () => {
    const buffer = makeCsv('\uFEFFbarcode,name,price\n123,Product A,10.50')
    const fmt = detectFormat(buffer, 'test.csv')
    const result = await fmt.parse(buffer)
    expect(result.headers[0]).toBe('barcode')
  })
})

// ─── JSON Format Tests ──────────────────────────────────────────────────────
describe('JSON Format', () => {
  it('parses array of objects', async () => {
    const data = JSON.stringify([{ barcode: '123', name: 'Product A', price: '10.50' }])
    const buffer = Buffer.from(data, 'utf-8')
    const fmt = detectFormat(buffer, 'test.json')
    expect(fmt).not.toBeNull()
    const result = await fmt.parse(buffer)
    expect(result.headers).toContain('barcode')
    expect(result.rows).toHaveLength(1)
  })

  it('parses NDJSON', async () => {
    const data = '{"barcode":"123","name":"A"}\n{"barcode":"456","name":"B"}\n'
    const buffer = Buffer.from(data, 'utf-8')
    const fmt = detectFormat(buffer, 'test.jsonl')
    const result = await fmt.parse(buffer)
    expect(result.rows).toHaveLength(2)
  })
})

// ─── XML Format Tests ───────────────────────────────────────────────────────
describe('XML Format', () => {
  it('parses product XML', async () => {
    const xml = `<?xml version="1.0"?>
    <products>
      <product><barcode>123</barcode><name>Product A</name><price>10.50</price></product>
      <product><barcode>456</barcode><name>Product B</name><price>20.00</price></product>
    </products>`
    const buffer = Buffer.from(xml, 'utf-8')
    const fmt = detectFormat(buffer, 'test.xml')
    expect(fmt).not.toBeNull()
    const result = await fmt.parse(buffer)
    expect(result.rows).toHaveLength(2)
    expect(result.headers).toContain('barcode')
  })
})

// ─── ZIP Format Tests ───────────────────────────────────────────────────────
describe('ZIP Format', () => {
  it('extracts and parses CSV from ZIP', async () => {
    const JSZip = await import('jszip')
    const zip = new JSZip.default()
    zip.file('produtos/catalogo.csv', 'barcode,name,price\n123,Product A,10.50\n456,Product B,20.00')
    zip.file('docs/readme.txt', 'This is a readme')
    const buffer = await zip.generateAsync({ type: 'nodebuffer' })

    const fmt = detectFormat(buffer, 'catalog.zip')
    expect(fmt).not.toBeNull()
    const result = await fmt.parse(buffer)
    expect(result.rows).toHaveLength(2)
    expect(result.metadata.zipFile).toContain('catalogo.csv')
  })

  it('rejects ZIP with dangerous files', async () => {
    const JSZip = await import('jszip')
    const zip = new JSZip.default()
    zip.file('produtos/catalogo.csv', 'barcode,name,price\n123,Product A,10.50')
    zip.file('malicious.exe', 'FAKE_EXE')
    zip.file('script.bat', 'DEL C:\\')
    const buffer = await zip.generateAsync({ type: 'nodebuffer' })

    const fmt = detectFormat(buffer, 'catalog.zip')
    const result = await fmt.parse(buffer)
    expect(result.rows).toHaveLength(1)
    expect(result.metadata.importableFiles).not.toContain('malicious.exe')
    expect(result.metadata.importableFiles).not.toContain('script.bat')
  })
})

// ─── Analyzer Tests ──────────────────────────────────────────────────────────
describe('Analyzer', () => {
  it('returns format info and preview for CSV', async () => {
    const buffer = makeCsv('barcode,name,price,stock\n123,Produto A,25.50,100\n456,Produto B,30.00,50')
    const result = await analyzeFile(buffer, 'catalogo.csv')
    expect(result.success).toBe(true)
    expect(result.format).toBe('csv')
    expect(result.headers).toEqual(['barcode', 'name', 'price', 'stock'])
    expect(result.preview).toHaveLength(2)
    expect(result.totalRows).toBe(2)
  })

  it('detects unsupported format', async () => {
    const buffer = Buffer.from('PK\x03\x04FAKE', 'utf-8')
    const result = await analyzeFile(buffer, 'document.pdf')
    expect(result.success).toBe(false)
    expect(result.error).toBeTruthy()
  })

  it('handles empty file', async () => {
    const buffer = Buffer.from('', 'utf-8')
    const result = await analyzeFile(buffer, 'empty.csv')
    expect(result.success).toBe(false)
  })
})

// ─── Validator Tests ─────────────────────────────────────────────────────────
describe('ImportValidator', () => {
  it('validates required fields', () => {
    const validator = new ImportValidator()
    const { valid, errors } = validator.validate({ name: '', price: 10 })
    expect(valid).toBe(false)
    expect(errors.some(e => e.includes('name'))).toBe(true)
  })

  it('accepts valid product', () => {
    const validator = new ImportValidator()
    const { valid, errors } = validator.validate({ name: 'Produto Teste', price: 25.50, stock: 100 })
    expect(valid).toBe(true)
    expect(errors).toHaveLength(0)
  })

  it('rejects invalid price', () => {
    const validator = new ImportValidator()
    const { valid, errors } = validator.validate({ name: 'Produto', price: 'abc' })
    expect(valid).toBe(false)
    expect(errors.some(e => e.includes('Preço') || e.includes('price'))).toBe(true)
  })

  it('resolves duplicates with skip policy', () => {
    const validator = new ImportValidator({ duplicatePolicy: 'skip' })
    const products = [
      { barcode: '123', name: 'Produto A', _conflict: 'new' },
      { barcode: '999', name: 'Produto B', _conflict: 'new' },
    ]
    const duplicates = {
      byBarcode: new Map([['123', { id: 1, name: 'Produto A Existing', sku: null, barcode: '123' }]]),
      bySku: new Map(),
    }
    const { resolved, conflicts } = validator.resolveDuplicates(products, duplicates)
    expect(conflicts).toHaveLength(1)
    expect(resolved[0]._conflict).toBe('skip')
    expect(resolved[1]._conflict).toBe('new')
  })
})

// ─── Integration: Full Import Flow ──────────────────────────────────────────
describe('ImportService Integration', () => {
  let insertCalls = 0
  let updateCalls = 0

  beforeEach(() => {
    insertCalls = 0
    updateCalls = 0
    mockPoolQuery.mockImplementation(async (query, params) => {
      console.log('  [MOCK]', query.substring(0, 80), '| p0=', JSON.stringify(params?.[0]))
      if (query.includes('SELECT id, name FROM categories')) {
        return { rows: [{ id: 1, name: 'Roupas' }, { id: 2, name: 'Acessórios' }] }
      }
      if (query.includes('SELECT * FROM products WHERE UPPER(sku)')) {
        return { rows: [] }
      }
      if (query.includes('FROM products WHERE barcode')) {
        const barcode = params[0]
        console.log('  [BARCODE CHECK]', barcode, '->', barcode === '7891234567890' ? 'EXISTS' : 'NOT FOUND')
        return { rows: barcode === '7891234567890' ? [{ id: 1, name: 'Existing', sku: null, barcode: '7891234567890' }] : [] }
      }
      if (query.includes('INSERT INTO products')) {
        insertCalls++
        console.log('  [INSERT]', insertCalls)
        return { rows: [{ id: 100 + insertCalls }] }
      }
      if (query.includes('UPDATE products SET')) {
        updateCalls++
        console.log('  [UPDATE]', updateCalls)
        return { rows: [{ id: params[params.length - 1] }] }
      }
      console.log('  [UNMATCHED]', query.substring(0, 60))
      return { rows: [] }
    })
  })

  it('imports CSV with auto-mapped columns', async () => {
    const buffer = makeCsv('barcode,name,price,stock\n7891234567890,Produto A,25.50,100\n7891234567891,Produto B,30.00,50')
    const service = new ImportService({ batchSize: 100 })
    const result = await service.import(buffer, 'test.csv', null, { duplicatePolicy: 'skip' })
    expect(result.success).toBe(true)
    // First has duplicate barcode → skipped, second is new → created
    expect(result.stats.updated).toBe(0)
    expect(result.stats.created).toBe(1)
  })

  it('imports CSV with semicolon delimiter', async () => {
    const buffer = makeCsv('codigo_barras;nome;preco;estoque\n123;Produto A;25.50;100')
    const service = new ImportService({ batchSize: 100 })
    const result = await service.import(buffer, 'test.csv', null, { duplicatePolicy: 'skip' })
    expect(result.success).toBe(true)
    expect(result.stats.created).toBe(1)
  })

  it('imports with explicit column mapping', async () => {
    const buffer = makeCsv('product_name,item_code,cost_price,quantity\nPROD-A,CODE-001,15.00,200')
    const mapping = { name: 'product_name', sku: 'item_code', cost: 'cost_price', stock: 'quantity' }
    const service = new ImportService({ batchSize: 100 })
    const result = await service.import(buffer, 'test.csv', mapping, { duplicatePolicy: 'skip' })
    expect(result.success).toBe(true)
    expect(result.stats.created).toBe(1)
  })

  it('handles missing required field gracefully', async () => {
    const buffer = makeCsv('sku,description\nABC-001,Some description')
    const service = new ImportService({ batchSize: 100 })
    const result = await service.import(buffer, 'test.csv', null, { duplicatePolicy: 'skip' })
    expect(result.success).toBe(true)
    expect(result.stats.errors).toBeGreaterThan(0)
  })

  it('imports JSON array', async () => {
    const data = JSON.stringify([
      { barcode: '7891234567890', name: 'Produto A', price: '25.50' },
      { barcode: '7891234567891', name: 'Produto B', price: '30.00' },
    ])
    const buffer = Buffer.from(data, 'utf-8')
    const service = new ImportService({ batchSize: 100 })
    const result = await service.import(buffer, 'produtos.json', null, { duplicatePolicy: 'skip' })
    expect(result.success).toBe(true)
    // First has duplicate barcode → skipped, second is new → created
    expect(result.stats.created).toBe(1)
  })

  it('handles duplicate barcodes with skip policy', async () => {
    const buffer = makeCsv('barcode,name,price\n7891234567890,Produto A,25.50\n7891234567890,Produto A Update,30.00')
    const service = new ImportService({ batchSize: 100 })
    const result = await service.import(buffer, 'test.csv', null, { duplicatePolicy: 'skip' })
    expect(result.success).toBe(true)
    // Both have same duplicate barcode → both skipped (not counted in stats)
    expect(result.stats.created).toBe(0)
    expect(result.stats.updated).toBe(0)
  })
})

// ─── Security Tests ──────────────────────────────────────────────────────────
describe('Import Security', () => {
  it('handles malformed CSV gracefully', async () => {
    // Unterminated quote — PapaParse handles this by closing the field
    const buffer = makeCsv('barcode,name,price\n123,Bad "quote,10.50\n456,OK,20.00')
    const fmt = detectFormat(buffer, 'test.csv')
    expect(fmt).not.toBeNull()
    const result = await fmt.parse(buffer)
    expect(result.rows.length).toBeGreaterThan(0)
  })

  it('handles very large header count', async () => {
    const headers = Array.from({ length: 200 }, (_, i) => `col_${i}`)
    const buffer = makeCsv(headers.join(',') + '\n' + Array(200).fill('value').join(','))
    const fmt = detectFormat(buffer, 'test.csv')
    const result = await fmt.parse(buffer)
    expect(result.headers.length).toBe(200)
  })
})

// ─── Edge Cases ──────────────────────────────────────────────────────────────
describe('Import Edge Cases', () => {
  it('handles single-row CSV', async () => {
    // Use a barcode that won't match the mock duplicate
    const buffer = makeCsv('barcode,name,price\n7891234567891,Only Product,99.99')
    const service = new ImportService({ batchSize: 100 })
    const result = await service.import(buffer, 'test.csv', null, { duplicatePolicy: 'skip' })
    expect(result.success).toBe(true)
    expect(result.stats.created).toBe(1)
  })

  it('handles empty rows in CSV', async () => {
    // First barcode matches mock duplicate, second is new
    const buffer = makeCsv('barcode,name,price\n7891234567890,Product A,10.00\n\n\n7891234567891,Product B,20.00')
    const service = new ImportService({ batchSize: 100 })
    const result = await service.import(buffer, 'test.csv', null, { duplicatePolicy: 'skip' })
    expect(result.success).toBe(true)
    expect(result.stats.created).toBe(1)
  })

  it('handles numeric barcodes with leading zeros', async () => {
    // Use valid 13-digit barcodes with leading zeros
    const buffer = makeCsv('barcode,name,price\n0007891234567,Product A,10.00\n0007891234568,Product B,20.00')
    const service = new ImportService({ batchSize: 100 })
    const result = await service.import(buffer, 'test.csv', null, { duplicatePolicy: 'skip' })
    expect(result.success).toBe(true)
    expect(result.stats.created).toBe(2)
  })

  it('handles empty file', async () => {
    const buffer = Buffer.from('', 'utf-8')
    const result = await analyzeFile(buffer, 'empty.csv')
    expect(result.success).toBe(false)
  })

  it('handles file with only headers', async () => {
    const buffer = makeCsv('barcode,name,price')
    const service = new ImportService({ batchSize: 100 })
    const result = await service.import(buffer, 'test.csv', null, { duplicatePolicy: 'skip' })
    // CSV parser requires at least 2 lines (header + data row)
    expect(result.success).toBe(false)
  })
})
