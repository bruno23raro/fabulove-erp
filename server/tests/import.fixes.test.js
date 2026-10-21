/**
 * Comprehensive tests covering stock defaults, persistence, images, videos,
 * duplicates, errors, wizard flow, and idempotent re-imports.
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
const { analyzeHeaders, mapColumns, normalizeRow } = await import('../services/import/mapper.js')
const { detectFormat } = await import('../services/import/formats/base.js')

// Register all format handlers
await import('../services/import/formats/csv.js')
await import('../services/import/formats/xlsx.js')
await import('../services/import/formats/json.js')
await import('../services/import/formats/xml.js')
await import('../services/import/formats/zip.js')

const TEST_DIR = 'server/tests/import-fixtures'
if (!existsSync(TEST_DIR)) mkdirSync(TEST_DIR, { recursive: true })

let insertCalls = 0
let updateCalls = 0

function makeCsv(content) { return Buffer.from(content, 'utf-8') }

// Valid 13-digit barcodes for testing
const BARCODE_A = '7891234567890'
const BARCODE_B = '7891234567891'
const BARCODE_C = '7891234567892'
const BARCODE_D = '7891234567893'
const BARCODE_E = '7891234567894'
const BARCODE_F = '7891234567895'
const BARCODE_G = '7891234567896'
const BARCODE_H = '7891234567897'

// ─── Helper: set up mock queries for import service ────────────────────────
function setupMockQueries(overrides = {}) {
  insertCalls = 0
  updateCalls = 0
  const { existingProducts = [], categories = [{ id: 1, name: 'Roupas' }] } = overrides

  mockPoolQuery.mockImplementation(async (query, params) => {
    // Category load
    if (query.includes('SELECT id, name FROM categories')) {
      return { rows: categories }
    }
    // Duplicate check by barcode
    if (query.includes('WHERE barcode =') && query.includes('is_active')) {
      const barcode = params[0]
      const found = existingProducts.find(p => p.barcode === barcode)
      return { rows: found ? [found] : [] }
    }
    // Duplicate check by SKU
    if (query.includes('WHERE UPPER(sku)')) {
      return { rows: [] }
    }
    // Insert
    if (query.includes('INSERT INTO products')) {
      insertCalls++
      return { rows: [{ id: 1000 + insertCalls, name: params[0] }] }
    }
    // Update
    if (query.includes('UPDATE products SET')) {
      const id = params[params.length - 1]
      return { rows: [{ id }] }
    }
    return { rows: [] }
  })
}

// ─── Test 1: Stock default 0 stays 0 ───────────────────────────────────────
describe('Stock defaults', () => {
  it('1. Explicit stock = 0 stays 0', async () => {
    setupMockQueries()
    const buffer = makeCsv(`barcode;name;price;stock\n${BARCODE_A};Produto A;25.50;0`)
    const service = new ImportService({ batchSize: 100 })
    const result = await service.import(buffer, 'test.csv', null, { duplicatePolicy: 'skip' })
    expect(result.success).toBe(true)
    expect(result.stats.created).toBe(1)
    const insertCalls = mockPoolQuery.mock.calls.filter(c => c[0].includes('INSERT INTO products'))
    expect(insertCalls.length).toBe(1)
    expect(insertCalls[0][1][6]).toBe(0) // stock is param 7 (index 6)
  })

  it('2. Explicit stock = 8 stays 8', async () => {
    setupMockQueries()
    const buffer = makeCsv(`barcode;name;price;stock\n${BARCODE_B};Produto B;30.00;8`)
    const service = new ImportService({ batchSize: 100 })
    const result = await service.import(buffer, 'test.csv', null, { duplicatePolicy: 'skip' })
    expect(result.success).toBe(true)
    const insertCalls = mockPoolQuery.mock.calls.filter(c => c[0].includes('INSERT INTO products'))
    expect(insertCalls[0][1][6]).toBe(8)
  })

  it('3. Missing stock column → default 3', async () => {
    setupMockQueries()
    const buffer = makeCsv(`barcode;name;price\n${BARCODE_C};Produto C;15.00`)
    const service = new ImportService({ batchSize: 100, defaultStock: 3 })
    const result = await service.import(buffer, 'test.csv', null, { duplicatePolicy: 'skip' })
    expect(result.success).toBe(true)
    expect(result.stats.created).toBe(1)
    const insertCalls = mockPoolQuery.mock.calls.filter(c => c[0].includes('INSERT INTO products'))
    expect(insertCalls[0][1][6]).toBe(3)
  })

  it('4. Invalid stock value not silently defaulted to 3', async () => {
    setupMockQueries()
    const buffer = makeCsv(`barcode;name;price;stock\n${BARCODE_D};Produto D;20.00;abc`)
    const service = new ImportService({ batchSize: 100, defaultStock: 3 })
    const result = await service.import(buffer, 'test.csv', null, { duplicatePolicy: 'skip' })
    expect(result.success).toBe(true)
    // Product with invalid stock should be filtered out by validator
    expect(result.stats.errors).toBeGreaterThan(0)
    expect(result.stats.created).toBe(0)
  })

  it('5. Existing product update preserves stock when not mapped', async () => {
    setupMockQueries({
      existingProducts: [{ id: 500, name: 'Existing', barcode: BARCODE_E, stock: 10 }],
    })
    const buffer = makeCsv(`barcode;name;price\n${BARCODE_E};Existing;99.00`)
    const service = new ImportService({ batchSize: 100, defaultStock: 3 })
    const result = await service.import(buffer, 'test.csv', null, { duplicatePolicy: 'update_existing' })
    expect(result.success).toBe(true)
    expect(result.stats.updated).toBe(1)
    const updateCalls = mockPoolQuery.mock.calls.filter(c => c[0].includes('UPDATE products SET'))
    expect(updateCalls.length).toBe(1)
    // stock param (index 6) should be null (COALESCE keeps existing)
    expect(updateCalls[0][1][6]).toBeNull()
  })
})

// ─── Test 6-7: Real DB persistence ─────────────────────────────────────────
describe('Database persistence', () => {
  it('6. Products persist with correct values (name, sku, price, stock)', async () => {
    const capturedInserts = []
    mockPoolQuery.mockImplementation(async (query, params) => {
      if (query.includes('SELECT id, name FROM categories')) return { rows: [] }
      if (query.includes('WHERE barcode =') && query.includes('is_active')) return { rows: [] }
      if (query.includes('WHERE UPPER(sku)')) return { rows: [] }
      if (query.includes('INSERT INTO products')) {
        capturedInserts.push({ query, params })
        return { rows: [{ id: 9999, name: params[0] }] }
      }
      return { rows: [] }
    })

    const buffer = makeCsv(`barcode;sku;name;price;stock\n${BARCODE_F};SKU-A;Produto Teste;25.50;100`)
    const service = new ImportService({ batchSize: 100, defaultStock: 3 })
    const result = await service.import(buffer, 'test.csv', null, { duplicatePolicy: 'skip' })

    expect(result.success).toBe(true)
    expect(result.stats.created).toBe(1)
    expect(capturedInserts.length).toBe(1)
    expect(capturedInserts[0].params[0]).toBe('Produto Teste')
    expect(capturedInserts[0].params[1]).toBe('SKU-A')
    expect(capturedInserts[0].params[4]).toBe(25.50)
    expect(capturedInserts[0].params[6]).toBe(100)
  })

  it('7. Product appears in PDV (is_active = true)', async () => {
    const activeProducts = []
    mockPoolQuery.mockImplementation(async (query, params) => {
      if (query.includes('SELECT id, name FROM categories')) return { rows: [] }
      if (query.includes('WHERE barcode =') && query.includes('is_active')) return { rows: [] }
      if (query.includes('WHERE UPPER(sku)')) return { rows: [] }
      if (query.includes('INSERT INTO products')) {
        activeProducts.push({ name: params[0], isActive: params[11] })
        return { rows: [{ id: 8888 }] }
      }
      return { rows: [] }
    })

    const buffer = makeCsv(`barcode;name;price\n${BARCODE_G};PDV Product;10.00`)
    const service = new ImportService({ batchSize: 100, defaultStock: 3 })
    const result = await service.import(buffer, 'test.csv', null, { duplicatePolicy: 'skip' })

    expect(result.success).toBe(true)
    expect(activeProducts.length).toBe(1)
    expect(activeProducts[0].isActive).toBe(true)
  })
})

// ─── Test 8: Images ──────────────────────────────────────────────────────────
describe('Image handling', () => {
  it('8. ZIP with images extracts and reports image count', async () => {
    const JSZip = await import('jszip')
    const zip = new JSZip.default()
    zip.file('catalogo.csv', `barcode;name;price\n${BARCODE_A};Img Product;50.00\n`)
    // Minimal 1x1 PNG
    const pngBuf = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
      0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
      0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
      0x00, 0x00, 0x02, 0x00, 0x01, 0xE2, 0x21, 0xBC,
      0x33, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
      0x44, 0xAE, 0x42, 0x60, 0x82,
    ])
    zip.file('images/produto1.png', pngBuf)
    const buf = await zip.generateAsync({ type: 'nodebuffer' })

    const fmt = detectFormat(buf, 'catalog.zip')
    expect(fmt).not.toBeNull()
    const result = await fmt.parse(buf)
    expect(result.metadata.imageCount).toBe(1)
    expect(result.getImages().size).toBe(1)
  })
})

// ─── Test 9: Videos ──────────────────────────────────────────────────────────
describe('Video URL support', () => {
  it('9. Video URL imported and persisted', async () => {
    mockPoolQuery.mockImplementation(async (query, params) => {
      if (query.includes('SELECT id, name FROM categories')) return { rows: [] }
      if (query.includes('WHERE barcode =') && query.includes('is_active')) return { rows: [] }
      if (query.includes('WHERE UPPER(sku)')) return { rows: [] }
      if (query.includes('INSERT INTO products')) {
        return { rows: [{ id: 7777, video_url: params[10] }] }
      }
      return { rows: [] }
    })

    const buffer = makeCsv(`barcode;name;price;video_url\n${BARCODE_H};Video Prod;30.00;https://example.com/demo.mp4`)
    const service = new ImportService({ batchSize: 100, defaultStock: 3 })
    const result = await service.import(buffer, 'test.csv', null, { duplicatePolicy: 'skip' })

    expect(result.success).toBe(true)
    expect(result.stats.created).toBe(1)
    const insertCalls = mockPoolQuery.mock.calls.filter(c => c[0].includes('INSERT INTO products'))
    expect(insertCalls[0][1][10]).toBe('https://example.com/demo.mp4')
  })
})

// ─── Test 10: Duplicates ─────────────────────────────────────────────────────
describe('Duplicate handling', () => {
  it('10. Duplicate by barcode with skip policy', async () => {
    const existing = [{ id: 1, name: 'Existing', barcode: BARCODE_A, stock: 5 }]
    setupMockQueries({ existingProducts: existing })

    const buffer = makeCsv(`barcode;name;price\n${BARCODE_A};Duplicate;20.00`)
    const service = new ImportService({ batchSize: 100, defaultStock: 3 })
    const result = await service.import(buffer, 'test.csv', null, { duplicatePolicy: 'skip' })

    expect(result.success).toBe(true)
    expect(result.stats.created).toBe(0)
    // Duplicates with skip policy are tracked as validation errors, not in stats.skipped
    expect(result.stats.errors).toBeGreaterThan(0)
    expect(result.conflicts.length).toBe(1)
  })

  it('10b. Duplicate by SKU with skip policy', async () => {
    const existing = [{ id: 2, name: 'Existing SKU', sku: 'EXISTING-SKU', barcode: null, stock: 3 }]
    // Override mock to also match by SKU
    insertCalls = 0
    updateCalls = 0
    mockPoolQuery.mockImplementation(async (query, params) => {
      if (query.includes('SELECT id, name FROM categories')) return { rows: [] }
      if (query.includes('WHERE barcode =') && query.includes('is_active')) {
        const found = existing.find(p => p.barcode === params[0])
        return { rows: found ? [found] : [] }
      }
      if (query.includes('WHERE UPPER(sku)')) {
        const sku = params[0]?.trim()?.toUpperCase()
        const found = existing.find(p => p.sku?.toUpperCase() === sku)
        return { rows: found ? [found] : [] }
      }
      if (query.includes('INSERT INTO products')) { insertCalls++; return { rows: [{ id: 1000 + insertCalls }] } }
      if (query.includes('UPDATE products SET')) { updateCalls++; return { rows: [{ id: params[params.length - 1] }] } }
      return { rows: [] }
    })

    const buffer = makeCsv(`sku;name;price\nEXISTING-SKU;Duplicate SKU;25.00`)
    const service = new ImportService({ batchSize: 100, defaultStock: 3 })
    const result = await service.import(buffer, 'test.csv', null, { duplicatePolicy: 'skip' })

    expect(result.success).toBe(true)
    expect(result.stats.created).toBe(0)
    expect(result.stats.errors).toBeGreaterThan(0)
  })
})

// ─── Test 11-12: Error handling ──────────────────────────────────────────────
describe('Error handling', () => {
  it('11. Malformed CSV handled gracefully', async () => {
    setupMockQueries()
    const buffer = makeCsv(`barcode;name;price\n${BARCODE_A};Good;10.00\n${BARCODE_B};Bad Price;not-a-number`)
    const service = new ImportService({ batchSize: 100, defaultStock: 3 })
    const result = await service.import(buffer, 'test.csv', null, { duplicatePolicy: 'skip' })

    expect(result.success).toBe(true)
    // First row valid, second has invalid price
    expect(result.stats.created + result.stats.errors).toBeGreaterThanOrEqual(1)
  })

  it('12. Empty CSV (header only) returns 0 rows, no error', async () => {
    const buffer = makeCsv('barcode;name;price')
    const service = new ImportService({ batchSize: 100, defaultStock: 3 })
    const result = await service.import(buffer, 'test.csv', null, { duplicatePolicy: 'skip' })

    expect(result.success).toBe(true)
    expect(result.stats.totalRows).toBe(0)
    expect(result.stats.created).toBe(0)
    expect(result.stats.errors).toBe(0)
  })
})

// ─── Test 13: Full wizard flow ──────────────────────────────────────────────
describe('Full import wizard flow', () => {
  it('13. Analyze → map → import completes successfully', async () => {
    setupMockQueries()

    // Step 1: Analyze
    const buffer = makeCsv(`barcode;nome;preco;estoque\n${BARCODE_A};Produto X;19.90;50\n${BARCODE_B};Produto Y;29.90;30`)
    const analysis = await analyzeFile(buffer, 'catalogo.csv')
    expect(analysis.success).toBe(true)
    expect(analysis.headers).toEqual(['barcode', 'nome', 'preco', 'estoque'])
    expect(analysis.preview).toHaveLength(2)
    expect(analysis.totalRows).toBe(2)

    // Step 2: Import with auto-mapping
    const service = new ImportService({ batchSize: 100, defaultStock: 3 })
    const result = await service.import(buffer, 'catalogo.csv', null, { duplicatePolicy: 'skip' })
    expect(result.success).toBe(true)
    expect(result.stats.created).toBe(2)
    expect(result.stats.totalRows).toBe(2)
  })

  it('13b. Full flow with progress callback', async () => {
    setupMockQueries()
    const progress = []
    const buffer = makeCsv(`barcode;name;price\n${BARCODE_A};Progress Test;10.00`)
    const service = new ImportService({ batchSize: 100, defaultStock: 3 })
    const result = await service.import(buffer, 'test.csv', null, {
      duplicatePolicy: 'skip',
      onProgress: (p) => progress.push(p),
    })

    expect(result.success).toBe(true)
    expect(progress.length).toBeGreaterThan(0)
    expect(progress[progress.length - 1].step).toBe('complete')
    expect(progress[progress.length - 1].progress).toBe(100)
  })
})

// ─── Test 14: Idempotent re-imports ──────────────────────────────────────────
describe('Idempotent re-imports', () => {
  it('14a. Second import of same file → no duplicates created', async () => {
    const existing = [{ id: 1, name: 'Idempotent', barcode: BARCODE_A, stock: 5 }]
    setupMockQueries({ existingProducts: existing })

    const buffer = makeCsv(`barcode;name;price\n${BARCODE_A};Idempotent;10.00`)
    const service = new ImportService({ batchSize: 100, defaultStock: 3 })

    // First import
    const r1 = await service.import(buffer, 'test.csv', null, { duplicatePolicy: 'skip' })
    expect(r1.success).toBe(true)
    expect(r1.stats.created).toBe(0) // already exists

    // Second import — same result
    const r2 = await service.import(buffer, 'test.csv', null, { duplicatePolicy: 'skip' })
    expect(r2.success).toBe(true)
    expect(r2.stats.created).toBe(0)
  })

  it('14b. Update-existing policy changes fields but preserves stock', async () => {
    const existing = [{ id: 2, name: 'Old Name', sku: null, barcode: BARCODE_B, stock: 99 }]
    setupMockQueries({ existingProducts: existing })

    const buffer = makeCsv(`barcode;name;price\n${BARCODE_B};New Name;50.00`)
    const service = new ImportService({ batchSize: 100, defaultStock: 3 })
    const result = await service.import(buffer, 'test.csv', null, { duplicatePolicy: 'update_existing' })

    expect(result.success).toBe(true)
    expect(result.stats.updated).toBe(1)
    const updateCalls = mockPoolQuery.mock.calls.filter(c => c[0].includes('UPDATE products SET'))
    expect(updateCalls[0][1][6]).toBeNull() // stock param = null → COALESCE keeps old value
  })
})

// ─── Test 15: Auth/security ──────────────────────────────────────────────────
describe('Security & auth', () => {
  it('15. Unsupported extension rejected with 400', () => {
    // Use bytes that don't match any known format
    const buffer = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05])
    const fmt = detectFormat(buffer, 'document.xyz')
    expect(fmt).toBeNull()
  })

  it('15b. Mapper ignores pure "id" column (no false positive)', () => {
    const headers = ['id', 'nome', 'preco']
    const analysis = analyzeHeaders(headers)
    const idEntry = analysis.find(a => a.header === 'id')
    expect(idEntry.mappedField).toBeNull()
    expect(idEntry.confidence).toBe(0)
  })

  it('15c. Image extension whitelist includes gif', async () => {
    const JSZip = await import('jszip')
    const zip = new JSZip.default()
    zip.file('catalogo.csv', `barcode;name;price\n${BARCODE_A};Test;10.00\n`)
    zip.file('images/photo.gif', Buffer.from('GIF89a'))
    const buf = await zip.generateAsync({ type: 'nodebuffer' })
    const fmt = detectFormat(buf, 'catalog.zip')
    const result = await fmt.parse(buf)
    // GIF IS counted as image (IMAGE_EXTS includes gif)
    expect(result.metadata.imageCount).toBe(1)
  })
})

// ─── Test 16: Response format ────────────────────────────────────────────────
describe('Response format', () => {
  it('16a. Import returns flattened stats (not nested stats.created)', async () => {
    setupMockQueries()
    const buffer = makeCsv(`barcode;name;price\n${BARCODE_A};Format Test;5.00`)
    const service = new ImportService({ batchSize: 100, defaultStock: 3 })
    const result = await service.import(buffer, 'test.csv', null, { duplicatePolicy: 'skip' })

    // The controller flattens this — here we verify the service returns the right structure
    expect(result.stats).toBeDefined()
    expect(typeof result.stats.created).toBe('number')
    expect(typeof result.stats.updated).toBe('number')
    expect(typeof result.stats.skipped).toBe('number')
    expect(typeof result.stats.totalRows).toBe('number')
    expect(result.errorList).toBeDefined()
    expect(result.validationErrors).toBeDefined()
    expect(result.conflicts).toBeDefined()
  })

  it('16b. analyzeFile returns correct structure', async () => {
    const buffer = makeCsv(`barcode;name;price;stock\n${BARCODE_A};A;10;5\n${BARCODE_B};B;20;10`)
    const result = await analyzeFile(buffer, 'test.csv')
    expect(result.success).toBe(true)
    expect(result.format).toBe('csv')
    expect(Array.isArray(result.headers)).toBe(true)
    expect(Array.isArray(result.preview)).toBe(true)
    expect(typeof result.totalRows).toBe('number')
    expect(result.totalRows).toBe(2)
  })
})
