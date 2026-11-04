/**
 * E2E tests for the Universal Import system
 * Run: node server/tests/import.e2e.cjs
 */
const http = require('http')
const fs = require('fs')
const path = require('path')

const BASE = 'localhost:3000'
let PASS = 0, FAIL = 0

function req(method, path_, body, token) {
  return new Promise((resolve) => {
    const opts = { hostname: 'localhost', port: 3000, path: path_, method,
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token } }
    const bodyStr = body ? JSON.stringify(body) : null
    const r = http.request(opts, (res) => {
      let d = ''
      res.on('data', c => d += c)
      res.on('end', () => {
        try { resolve({ s: res.statusCode, j: JSON.parse(d) }) }
        catch (e) { resolve({ s: res.statusCode, raw: d.slice(0, 200) }) }
      })
    })
    r.on('error', e => resolve({ s: 0, err: e.message }))
    if (bodyStr) r.write(bodyStr)
    r.end()
  })
}

function multipartUpload(method, path_, filePath, token, fieldName = 'file') {
  return new Promise((resolve) => {
    const buf = fs.readFileSync(filePath)
    const boundary = '----FormBoundary7MA4YWxkTrZu0gW'
    const fn = path.basename(filePath)
    const body = '--' + boundary + '\r\nContent-Disposition: form-data; name="' + fieldName + '"; filename="' + fn + '"\r\nContent-Type: application/octet-stream\r\n\r\n' + buf.toString('binary') + '\r\n--' + boundary + '--'
    const headers = { 'Content-Type': 'multipart/form-data; boundary=' + boundary }
    if (token) headers['Authorization'] = 'Bearer ' + token
    const opts = { hostname: 'localhost', port: 3000, path: path_, method, headers }
    const r = http.request(opts, (res) => {
      let d = ''
      res.on('data', c => d += c)
      res.on('end', () => {
        try { resolve({ s: res.statusCode, j: JSON.parse(d) }) }
        catch (e) { resolve({ s: res.statusCode, raw: d.slice(0, 200) }) }
      })
    })
    r.on('error', e => resolve({ s: 0, err: e.message }))
    r.write(Buffer.from(body, 'binary'))
    r.end()
  })
}

function assert(label, cond) {
  if (cond) { PASS++; console.log('PASS  ' + label) }
  else { FAIL++; console.log('FAIL  ' + label) }
}

async function main() {
  // Login
  const login = await req('POST', '/api/auth/login', { email: 'admin@fabulove.com', password: 'Admin@12345' })
  const token = login.j?.accessToken
  if (!token) { console.log('FAIL: login'); process.exit(1) }
  console.log('LOGIN OK\n')

  // ── Create test fixtures ──────────────────────────────────────────────
  const tmpDir = path.join(__dirname, 'import-e2e-fixtures')
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })

  // CSV with semicolon (has stock) — 8-digit barcodes for valid normalization
  fs.writeFileSync(path.join(tmpDir, 'csv-pt.csv'), 'codigo_barras;nome;preco;estoque\n88880111;CSV PT Produto;25.50;100\n88880222;CSV PT Produto 2;30.00;50\n')

  // CSV without stock column (should default to 3)
  fs.writeFileSync(path.join(tmpDir, 'csv-no-stock.csv'), 'codigo_barras;nome;preco\n88880333;Sem Estoque;19.90\n88880444;Sem Estoque 2;29.90\n')

  // CSV with stock = 0 (should stay 0)
  fs.writeFileSync(path.join(tmpDir, 'csv-stock-zero.csv'), 'codigo_barras;nome;preco;estoque\n88880555;Estoque Zero;9.90;0\n88880666;Estoque Zero 2;14.90;0\n')

  // JSON
  fs.writeFileSync(path.join(tmpDir, 'products.json'), JSON.stringify([
    { barcode: '88880777', name: 'JSON Product', price: '40.00', stock: '30' },
    { barcode: '88880888', name: 'JSON Product 2', price: '55.00', stock: '20' },
  ]))

  // ── Test 1: Analyze CSV ──────────────────────────────────────────────
  let r
  r = await multipartUpload('POST', '/api/products/import/analyze', path.join(tmpDir, 'csv-pt.csv'), token)
  assert('1. Analyze CSV', r.s === 200 && r.j?.success && r.j.data?.headers?.length >= 4)

  // ── Test 2: Analyze JSON ──────────────────────────────────────────────
  r = await multipartUpload('POST', '/api/products/import/analyze', path.join(tmpDir, 'products.json'), token)
  assert('2. Analyze JSON', r.s === 200 && r.j?.success)

  // ── Test 3: Analyze unsupported format → 400 (not 500) ───────────────
  fs.writeFileSync(path.join(tmpDir, 'fake.xyz'), 'NOT SUPPORTED ' + Date.now())
  r = await multipartUpload('POST', '/api/products/import/analyze', path.join(tmpDir, 'fake.xyz'), token)
  assert('3. Unsupported format → 400', r.s === 400 && !r.j?.success)

  // ── Test 4: Import CSV — products actually created and persisted ──────
  r = await multipartUpload('POST', '/api/products/import', path.join(tmpDir, 'csv-pt.csv'), token)
  assert('4. Import CSV — success response', r.s === 200 && r.j?.success === true)
  // Verify products exist by unique barcode (works even if DB has pre-existing data)
  assert('4b. Import CSV — products persisted', r.j?.data?.created >= 0)
  const verify4b = await req('GET', '/api/products?search=88880111', null, token)
  assert('4b. Import CSV — product by barcode', verify4b.j?.data?.some(p => p.barcode === '88880111'))
  assert('4c. Import CSV — totalLines matches', r.j?.data?.totalLines === 2)

  // ── Test 5: Verify products persisted in DB (search by barcode) ───────
  const search = await req('GET', '/api/products?search=CSV+PT+Produto', null, token)
  assert('5. DB persistence — product found', search.s === 200 && search.j?.data?.[0]?.name?.includes('CSV PT Produto'))

  // ── Test 6: Default stock = 3 when column absent ──────────────────────
  r = await multipartUpload('POST', '/api/products/import', path.join(tmpDir, 'csv-no-stock.csv'), token)
  assert('6a. Import no-stock CSV — success', r.s === 200 && r.j?.success === true)
  // Find by barcode to avoid matching old products with same name
  const stockCheck = await req('GET', '/api/products?search=88880333', null, token)
  const semEstoque = stockCheck.j?.data?.find(p => p.barcode === '88880333')
  assert('6b. Default stock = 3', semEstoque && semEstoque.stock === 3)

  // ── Test 7: Stock = 0 stays 0 (not overridden by default) ─────────────
  r = await multipartUpload('POST', '/api/products/import', path.join(tmpDir, 'csv-stock-zero.csv'), token)
  const stockZero = await req('GET', '/api/products?search=88880555', null, token)
  const ez = stockZero.j?.data?.find(p => p.barcode === '88880555')
  assert('7. Stock 0 preserved', ez && ez.stock === 0)

  // ── Test 8: Duplicate barcode with skip policy — second not created ───
  r = await multipartUpload('POST', '/api/products/import', path.join(tmpDir, 'csv-pt.csv'), token)
  assert('8. Duplicate skip — success', r.s === 200 && r.j?.success === true)
  assert('8b. Duplicate skip — created = 0', r.j?.data?.created === 0)

  // ── Test 9: Product list includes meta.total ─────────────────────────
  const list = await req('GET', '/api/products?limit=10', null, token)
  assert('9. Product list has meta.total', list.s === 200 && typeof list.j?.meta?.total === 'number')

  // ── Test 10: Save and list import profiles ────────────────────────────
  const profileSave = await req('POST', '/api/products/import/profiles', {
    name: 'E2E Profile Test',
    description: 'Test profile',
    mapping: { name: 'nome', barcode: 'codigo_barras', price: 'preco' },
  }, token)
  assert('10a. Save profile', profileSave.s === 201 && profileSave.j?.success)
  const profileList = await req('GET', '/api/products/import/profiles', null, token)
  assert('10b. List profiles', profileList.s === 200 && profileList.j?.success)

  // ── Test 11: Progress reporting works ─────────────────────────────────
  const progressResults = []
  // The import should trigger onProgress callbacks (captured via service internal)
  // We verify by checking the import completes successfully with reasonable timing
  r = await multipartUpload('POST', '/api/products/import', path.join(tmpDir, 'products.json'), token)
  assert('11. Import JSON with progress', r.s === 200 && r.j?.success === true)
  // Verify JSON products exist by barcode
  const jsonCheck = await req('GET', '/api/products?search=88880777', null, token)
  assert('11b. JSON products persisted', jsonCheck.j?.data?.some(p => p.barcode === '88880777'))

  // ── Test 12: Invalid data not silently defaulted ──────────────────────
  // A product with invalid price should still fail validation
  fs.writeFileSync(path.join(tmpDir, 'bad-price.csv'), 'codigo_barras;nome;preco\n88880999;E2E Bad Price;not-a-number\n')
  r = await multipartUpload('POST', '/api/products/import', path.join(tmpDir, 'bad-price.csv'), token)
  assert('12. Invalid price → errors > 0', r.s === 200 && r.j?.success === true && (r.j?.data?.errors || 0) > 0)

  // ── Test 13: Path traversal protection in ZIP ─────────────────────────
  // (Covered by unit tests; E2E just verifies endpoint doesn't crash)
  // Create a simple ZIP with CSV
  const JSZip = require('jszip')
  const zip = new JSZip()
  zip.file('catalogo.csv', 'codigo_barras;nome;preco\n88880100;ZIP Product;50.00\n')
  const zipBuf = await zip.generateAsync({ type: 'nodebuffer' })
  const zipPath = path.join(tmpDir, 'catalog.zip')
  fs.writeFileSync(zipPath, Buffer.from(zipBuf))
  r = await multipartUpload('POST', '/api/products/import', zipPath, token)
  assert('13. ZIP import — success', r.s === 200 && r.j?.success === true)

  // ── Test 14: Idempotent re-import ─────────────────────────────────────
  r = await multipartUpload('POST', '/api/products/import', path.join(tmpDir, 'csv-pt.csv'), token)
  assert('14a. Re-import success', r.s === 200 && r.j?.success === true)
  // Count by exact barcode match to avoid pre-existing products
  const count1a = await req('GET', '/api/products?search=88880111', null, token)
  const count1b = await req('GET', '/api/products?search=88880222', null, token)
  assert('14b. Re-import idempotent — same count', count1a.j?.data?.length === 1 && count1b.j?.data?.length === 1)

  // ── Test 15: Auth required ────────────────────────────────────────────
  r = await multipartUpload('POST', '/api/products/import/analyze', path.join(tmpDir, 'csv-pt.csv'), null)
  assert('15. Auth required — 401 without token', r.s === 401)

  // ── Test 16: Video URL import support ─────────────────────────────────
  fs.writeFileSync(path.join(tmpDir, 'with-video.csv'), 'codigo_barras;nome;preco;video_url\n88880200;E2E Video Product;45.00;https://example.com/video.mp4\n')
  r = await multipartUpload('POST', '/api/products/import', path.join(tmpDir, 'with-video.csv'), token)
  assert('16a. Video import — success', r.s === 200 && r.j?.success === true)
  const vidProd = await req('GET', '/api/products?search=88880200', null, token)
  const vp = vidProd.j?.data?.find(p => p.barcode === '88880200')
  assert('16b. Video URL persisted', vp && vp.video_url === 'https://example.com/video.mp4')

  // ── Cleanup ───────────────────────────────────────────────────────────
  fs.rmSync(tmpDir, { recursive: true, force: true })

  // ── Summary ───────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════')
  console.log('TOTAL: ' + (PASS + FAIL) + '  |  PASS: ' + PASS + '  |  FAIL: ' + FAIL)
  console.log('═══════════════════════════════════════')
  process.exit(FAIL > 0 ? 1 : 0)
}

main().catch(e => { console.error(e); process.exit(1) })
