/**
 * Real end-to-end validation of product import — persists to DB, verifies via direct queries
 * Run: node server/tests/import.real-validation.cjs
 *
 * Uses 8-digit numeric barcodes (TEST prefix stripped — real barcodes are digits only).
 * Alphanumeric barcodes like "TEST-001" are normalized to null by design (BARCODE regex: ^[\d\-]{8,14}$).
 */
const http = require('http')
const fs = require('fs')
const path = require('path')
const pg = require('pg')

const { Client } = pg
const connStr = process.env.DATABASE_URL || 'postgres://postgres:b23b23v1814@localhost:5432/fabulove_erp'
const client = new Client(connStr)

const FIXTURES = path.join(__dirname, 'import-e2e-fixtures')
const REPORT = []
let TOKEN = ''

// ── Helpers ────────────────────────────────────────────────────────────────
async function getToken() {
  return new Promise((resolve) => {
    const body = JSON.stringify({ email: 'admin@fabulove.com', password: 'Admin@12345' })
    const opts = { hostname: 'localhost', port: 3000, path: '/api/auth/login', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } }
    const r = http.request(opts, (res) => {
      let d = ''
      res.on('data', c => d += c)
      res.on('end', () => { try { resolve(JSON.parse(d).accessToken); }
        catch (e) { resolve(null); } })
    })
    r.on('error', e => resolve(null))
    r.write(body)
    r.end()
  })
}

// Barcodes must be 8-14 pure digits to pass normalizeBarcode
const B = {
  noStock:   '88881001',
  stockZero: '88881002',
  stock8:    '88881003',
  dup:       '88881001',   // same as noStock (re-import)
  valid8:    '88881004',
  short3:    '777',        // invalid → null barcode
  validDup:  '88881005',   // duplicate of this → conflict
  media:     '88881006',
  badPrice:  '88881007',
}

// ── Helpers ────────────────────────────────────────────────────────────────
function req(method, urlPath, body) {
  return new Promise((resolve) => {
    const opts = { hostname: 'localhost', port: 3000, path: urlPath, method,
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + TOKEN } }
    const bodyStr = body ? JSON.stringify(body) : null
    const r = http.request(opts, (res) => {
      let d = ''
      res.on('data', c => d += c)
      res.on('end', () => {
        try { resolve({ s: res.statusCode, j: JSON.parse(d) }) }
        catch (e) { resolve({ s: res.statusCode, raw: d.slice(0, 500) }) }
      })
    })
    r.on('error', e => resolve({ s: 0, err: e.message }))
    if (bodyStr) r.write(bodyStr)
    r.end()
  })
}

function multipartUpload(method, urlPath, filePath) {
  return new Promise((resolve) => {
    const buf = fs.readFileSync(filePath)
    const boundary = '----FormBoundary7MA4YWxkTrZu0gW'
    const fn = path.basename(filePath)
    const payload = '--' + boundary + '\r\n' +
      'Content-Disposition: form-data; name="file"; filename="' + fn + '"\r\n' +
      'Content-Type: application/octet-stream\r\n\r\n' +
      buf.toString('binary') + '\r\n--' + boundary + '--'
    const opts = { hostname: 'localhost', port: 3000, path: urlPath, method,
      headers: {
        'Content-Type': 'multipart/form-data; boundary=' + boundary,
        'Authorization': 'Bearer ' + TOKEN,
      } }
    const r = http.request(opts, (res) => {
      let d = ''
      res.on('data', c => d += c)
      res.on('end', () => {
        try { resolve({ s: res.statusCode, j: JSON.parse(d) }) }
        catch (e) { resolve({ s: res.statusCode, raw: d.slice(0, 500) }) }
      })
    })
    r.on('error', e => resolve({ s: 0, err: e.message }))
    r.write(Buffer.from(payload, 'binary'))
    r.end()
  })
}

async function dbQuery(sql, params) {
  return client.query(sql, params || [])
}

function assert(label, cond, detail) {
  const ok = !!cond
  const status = ok ? 'PASS' : 'FAIL'
  console.log('  ' + status + ' ' + label + (detail ? ': ' + detail : ''))
  REPORT.push({ label, ok, detail: detail || '' })
  return ok
}

// ── Setup ──────────────────────────────────────────────────────────────────
async function setup() {
  TOKEN = await getToken()
  if (!TOKEN) { console.error('FATAL: Could not authenticate'); process.exit(1) }
  await client.connect()
  fs.mkdirSync(FIXTURES, { recursive: true })

  // Clean up leftover test products from previous runs
  const existing = await dbQuery(
    "SELECT id, barcode, name FROM products WHERE name LIKE 'VALIDATION %'")
  if (existing.rows.length > 0) {
    console.log('Cleaning up ' + existing.rows.length + ' leftover VALIDATION products...')
    for (const p of existing.rows) {
      await req('DELETE', '/api/products/' + p.id)
    }
    const verify = await dbQuery("SELECT COUNT(*) as c FROM products WHERE name LIKE 'VALIDATION %'")
    console.log('  Remaining: ' + verify.rows[0].c)
  }
}

async function cleanup() {
  const toDelete = await dbQuery("SELECT id FROM products WHERE name LIKE 'VALIDATION %'")
  console.log('\nCleaning up ' + toDelete.rows.length + ' test products...')
  for (const p of toDelete.rows) {
    await req('DELETE', '/api/products/' + p.id)
  }
  const remaining = await dbQuery("SELECT COUNT(*) as c FROM products WHERE name LIKE 'VALIDATION %'")
  console.log('  Remaining: ' + remaining.rows[0].c)
}

// ── Main tests ─────────────────────────────────────────────────────────────
async function runTests() {
  console.log('\n' + '='.repeat(58))
  console.log('  REAL VALIDATION — Product Import End-to-End')
  console.log('  DB: ' + connStr.split('@')[1])
  console.log('='.repeat(58) + '\n')

  // ════════════════════════════════════════════════════════════
  // Test 1: Import without stock column → default 3
  // ════════════════════════════════════════════════════════════
  console.log('── Test 1: Stock default = 3 (no stock column) ──')
  const f1 = path.join(FIXTURES, 'v1.csv')
  fs.writeFileSync(f1, 'codigo_barras;nome;preco\n' + B.noStock + ';VALIDATION No Stock;19.90\n')
  const r1 = await multipartUpload('POST', '/api/products/import', f1)
  console.log('  HTTP ' + r1.s + ' | created=' + r1.j?.data?.created + ' errors=' + r1.j?.data?.errors)
  const t1 = await dbQuery("SELECT id, barcode, name, stock FROM products WHERE barcode = $1", [B.noStock])
  assert('HTTP 200', r1.s === 200)
  assert('Product created in DB', t1.rows.length === 1)
  assert('Stock = 3 (default)', t1.rows[0].stock === 3, 'got ' + t1.rows[0].stock)

  // ════════════════════════════════════════════════════════════
  // Test 2: Import with stock = 0 → stays 0
  // ════════════════════════════════════════════════════════════
  console.log('\n── Test 2: Stock = 0 (preserved) ──')
  const f2 = path.join(FIXTURES, 'v2.csv')
  fs.writeFileSync(f2, 'codigo_barras;nome;preco;estoque\n' + B.stockZero + ';VALIDATION Zero Stock;9.90;0\n')
  const r2 = await multipartUpload('POST', '/api/products/import', f2)
  console.log('  HTTP ' + r2.s + ' | created=' + r2.j?.data?.created + ' errors=' + r2.j?.data?.errors)
  const t2 = await dbQuery("SELECT id, barcode, name, stock FROM products WHERE barcode = $1", [B.stockZero])
  assert('HTTP 200', r2.s === 200)
  assert('Product created in DB', t2.rows.length === 1)
  assert('Stock = 0 (preserved)', t2.rows[0].stock === 0, 'got ' + t2.rows[0].stock)

  // ════════════════════════════════════════════════════════════
  // Test 3: Import with stock = 8 → stays 8
  // ════════════════════════════════════════════════════════════
  console.log('\n── Test 3: Stock = 8 (preserved) ──')
  const f3 = path.join(FIXTURES, 'v3.csv')
  fs.writeFileSync(f3, 'codigo_barras;nome;preco;estoque\n' + B.stock8 + ';VALIDATION Stock 8;45.00;8\n')
  const r3 = await multipartUpload('POST', '/api/products/import', f3)
  console.log('  HTTP ' + r3.s + ' | created=' + r3.j?.data?.created + ' errors=' + r3.j?.data?.errors)
  const t3 = await dbQuery("SELECT id, barcode, name, stock FROM products WHERE barcode = $1", [B.stock8])
  assert('HTTP 200', r3.s === 200)
  assert('Product created in DB', t3.rows.length === 1)
  assert('Stock = 8 (preserved)', t3.rows[0].stock === 8, 'got ' + t3.rows[0].stock)

  // ════════════════════════════════════════════════════════════
  // Test 4: Re-import duplicate → no new rows
  // ════════════════════════════════════════════════════════════
  console.log('\n── Test 4: Re-import duplicate (same barcode) ──')
  const r4 = await multipartUpload('POST', '/api/products/import', f1)
  console.log('  HTTP ' + r4.s + ' | created=' + r4.j?.data?.created + ' errors=' + r4.j?.data?.errors)
  const t4 = await dbQuery("SELECT COUNT(*) as c FROM products WHERE barcode = $1", [B.noStock])
  assert('No duplicate row created', parseInt(t4.rows[0].c) === 1, 'got ' + t4.rows[0].c)
  assert('Duplicate conflict reported (errors > 0)', (r4.j?.data?.errors || 0) > 0, 'errors=' + r4.j?.data?.errors)

  // ════════════════════════════════════════════════════════════
  // Test 5: Barcode formats
  // ════════════════════════════════════════════════════════════
  console.log('\n── Test 5: Barcode validation ──')

  // 5a: Valid 8-digit barcode
  const f5a = path.join(FIXTURES, 'v5a.csv')
  fs.writeFileSync(f5a, 'codigo_barras;nome;preco\n' + B.valid8 + ';VALIDATION Valid Barcode;10.00\n')
  const r5a = await multipartUpload('POST', '/api/products/import', f5a)
  const t5a = await dbQuery("SELECT barcode FROM products WHERE barcode = $1", [B.valid8])
  assert('5a. Valid 8-digit barcode accepted', t5a.rows.length === 1, 'barcode=' + JSON.stringify(t5a.rows[0]?.barcode))

  // 5b: Short 3-digit barcode → normalized to null, product created without barcode
  const f5b = path.join(FIXTURES, 'v5b.csv')
  fs.writeFileSync(f5b, 'codigo_barras;nome;preco\n777;VALIDATION Short Barcode;10.00\n')
  const r5b = await multipartUpload('POST', '/api/products/import', f5b)
  const t5b = await dbQuery("SELECT barcode, name FROM products WHERE name = 'VALIDATION Short Barcode' ORDER BY id DESC LIMIT 1")
  console.log('  5b. Response: created=' + r5b.j?.data?.created + ' errors=' + r5b.j?.data?.errors + ' | DB barcode=' + JSON.stringify(t5b.rows[0]?.barcode))
  // Short barcodes are normalized to null — product still created, just without barcode
  assert('5b. Short barcode normalized to null (not silently accepted as valid)',
    t5b.rows[0]?.barcode === null, 'barcode=' + JSON.stringify(t5b.rows[0]?.barcode))

  // 5c: Leading zeros preserved in 13-digit barcode
  const f5c = path.join(FIXTURES, 'v5c.csv')
  fs.writeFileSync(f5c, 'codigo_barras;nome;preco\n0012345678901;VALIDATION Leading Zeros;20.00\n')
  const r5c = await multipartUpload('POST', '/api/products/import', f5c)
  const t5c = await dbQuery("SELECT barcode FROM products WHERE barcode = '0012345678901'")
  assert('5c. Leading zeros preserved', t5c.rows.length === 1, 'barcode=' + JSON.stringify(t5c.rows[0]?.barcode))

  // 5d: Duplicate valid barcode → conflict, no new row
  const f5d = path.join(FIXTURES, 'v5d.csv')
  fs.writeFileSync(f5d, 'codigo_barras;nome;preco\n' + B.validDup + ';VALIDATION Dup Barcode;20.00\n')
  const r5d = await multipartUpload('POST', '/api/products/import', f5d)
  const t5d = await dbQuery("SELECT COUNT(*) as c FROM products WHERE barcode = $1", [B.validDup])
  assert('5d. Duplicate barcode not duplicated', parseInt(t5d.rows[0].c) === 1, 'got ' + t5d.rows[0].c)

  // 5e: Alphanumeric barcode (TEST-001 style) → normalized to null
  const f5e = path.join(FIXTURES, 'v5e.csv')
  fs.writeFileSync(f5e, 'codigo_barras;nome;preco\nTEST-001;VALIDATION Alpha Barcode;25.00\n')
  const r5e = await multipartUpload('POST', '/api/products/import', f5e)
  const t5e = await dbQuery("SELECT barcode, name FROM products WHERE name = 'VALIDATION Alpha Barcode' ORDER BY id DESC LIMIT 1")
  console.log('  5e. Response: created=' + r5e.j?.data?.created + ' | DB barcode=' + JSON.stringify(t5e.rows[0]?.barcode))
  assert('5e. Alphanumeric barcode normalized to null', t5e.rows[0]?.barcode === null,
    'barcode=' + JSON.stringify(t5e.rows[0]?.barcode))

  // ════════════════════════════════════════════════════════════
  // Test 6: Image URL + Video URL persistence
  // ════════════════════════════════════════════════════════════
  console.log('\n── Test 6: Image URL + Video URL import ──')
  const f6 = path.join(FIXTURES, 'v6.csv')
  fs.writeFileSync(f6, 'codigo_barras;nome;preco;image_url;video_url\n' + B.media + ';VALIDATION Media;55.00;https://example.com/img.jpg;https://example.com/video.mp4\n')
  const r6 = await multipartUpload('POST', '/api/products/import', f6)
  console.log('  HTTP ' + r6.s + ' | Response:', JSON.stringify(r6.j?.data))
  const t6 = await dbQuery("SELECT image_url, video_url FROM products WHERE barcode = $1", [B.media])
  assert('6a. HTTP 200', r6.s === 200)
  assert('6b. Product created in DB', t6.rows.length === 1)
  assert('6c. Image URL persisted', t6.rows[0].image_url === 'https://example.com/img.jpg', 'got ' + JSON.stringify(t6.rows[0].image_url))
  assert('6d. Video URL persisted', t6.rows[0].video_url === 'https://example.com/video.mp4', 'got ' + JSON.stringify(t6.rows[0].video_url))

  // Verify via API (simulates page refresh)
  const apiList = await req('GET', '/api/products?search=' + B.media)
  const fromApi = apiList.j?.data?.find(p => p.barcode === B.media)
  assert('6e. Image URL via API (page refresh)', fromApi && fromApi.image_url === 'https://example.com/img.jpg', 'api=' + JSON.stringify(fromApi?.image_url))
  assert('6f. Video URL via API (page refresh)', fromApi && fromApi.video_url === 'https://example.com/video.mp4', 'api=' + JSON.stringify(fromApi?.video_url))

  // Detail endpoint
  const detailId = fromApi?.id
  const detailCheck = await req('GET', '/api/products/' + detailId)
  assert('6g. Video URL in detail view', detailCheck.j?.data?.video_url === 'https://example.com/video.mp4',
    'detail=' + JSON.stringify(detailCheck.j?.data?.video_url))

  // ════════════════════════════════════════════════════════════
  // Test 7: Products visible in list, detail, PDV
  // ════════════════════════════════════════════════════════════
  console.log('\n── Test 7: Visibility — list, detail, PDV ──')
  const listCheck = await req('GET', '/api/products?search=' + B.stockZero)
  assert('7a. Product in list', listCheck.j?.data?.some(p => p.barcode === B.stockZero))
  assert('7b. meta.total present in list', typeof listCheck.j?.meta?.total === 'number')

  const detId = t2.rows[0].id
  const detailCheck2 = await req('GET', '/api/products/' + detId)
  assert('7c. Product in detail view', detailCheck2.j?.data?.barcode === B.stockZero)
  assert('7d. Stock value correct in detail', detailCheck2.j?.data?.stock === 0)

  const pdvCheck = await req('GET', '/api/products?search=VALIDATION+Zero+Stock&limit=10')
  assert('7e. Product in search/PDV', pdvCheck.j?.data?.some(p => p.barcode === B.stockZero))

  // ════════════════════════════════════════════════════════════
  // Test 8: ZIP with empty CSV
  // ════════════════════════════════════════════════════════════
  console.log('\n── Test 8: ZIP with empty CSV ──')
  const JSZip = require('jszip')
  const zip = new JSZip()
  zip.file('produtos/catalogo.csv', 'codigo_barras;nome;preco\n')
  const zipBuf = await zip.generateAsync({ type: 'nodebuffer' })
  const zipPath = path.join(FIXTURES, 'real-empty-zip.zip')
  fs.writeFileSync(zipPath, Buffer.from(zipBuf))
  const r8 = await multipartUpload('POST', '/api/products/import', zipPath)
  console.log('  HTTP ' + r8.s + ' | Response:', JSON.stringify(r8.j?.data))
  assert('8a. ZIP import does not crash', r8.s === 200)
  assert('8b. No products created from empty CSV', r8.j?.data?.created === 0, 'created=' + r8.j?.data?.created)
  const imagesPending = await req('GET', '/api/products/import/images/pending')
  assert('8c. No pending images', (imagesPending.j?.total || 0) === 0, 'total=' + imagesPending.j?.total)

  // ════════════════════════════════════════════════════════════
  // Test 9: Invalid price rejection
  // ════════════════════════════════════════════════════════════
  console.log('\n── Test 9: Invalid price rejection ──')
  const f9 = path.join(FIXTURES, 'v9.csv')
  fs.writeFileSync(f9, 'codigo_barras;nome;preco\n' + B.badPrice + ';VALIDATION Bad Price;not-a-number\n')
  const r9 = await multipartUpload('POST', '/api/products/import', f9)
  console.log('  HTTP ' + r9.s + ' | Response:', JSON.stringify(r9.j?.data))
  const t9 = await dbQuery("SELECT COUNT(*) as c FROM products WHERE barcode = $1", [B.badPrice])
  assert('9a. Endpoint returns 200', r9.s === 200)
  assert('9b. Product NOT created', parseInt(t9.rows[0].c) === 0, 'count=' + t9.rows[0].c)
  assert('9c. Validation errors reported', (r9.j?.data?.errors || 0) > 0, 'errors=' + r9.j?.data?.errors)
  const hasPriceError = (r9.j?.data?.validationErrors || []).some(e =>
    e.errors?.some(err => err.includes('Preço inválido')))
  assert('9d. Clear error message about invalid price', hasPriceError,
    JSON.stringify(r9.j?.data?.validationErrors))

  // ════════════════════════════════════════════════════════════
  // Summary
  // ════════════════════════════════════════════════════════════
  const passed = REPORT.filter(r => r.ok).length
  const total = REPORT.length
  const failed = REPORT.filter(r => !r.ok)

  console.log('\n' + '='.repeat(58))
  console.log('  RESULT: ' + passed + '/' + total + ' checks passed' + (failed.length > 0 ? ', ' + failed.length + ' failed' : ''))
  if (failed.length > 0) {
    console.log('\n  Failed checks:')
    for (const f of failed) {
      console.log('    X ' + f.label + (f.detail ? ' — ' + f.detail : ''))
    }
  }
  console.log('='.repeat(58))

  // ── Cleanup ──
  await cleanup()
  await client.end()
}

// ── Run ────────────────────────────────────────────────────────────────────
setup()
  .then(runTests)
  .catch(e => { console.error('FATAL:', e.message); process.exit(1) })
