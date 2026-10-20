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
    const opts = { hostname: 'localhost', port: 3000, path: path_, method,
      headers: { 'Content-Type': 'multipart/form-data; boundary=' + boundary, 'Authorization': 'Bearer ' + token } }
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

async function main() {
  // Login
  const login = await req('POST', '/api/auth/login', { email: 'admin@fabulove.com', password: 'Admin@12345' })
  const token = login.j?.accessToken
  if (!token) { console.log('FAIL: login'); process.exit(1) }
  console.log('LOGIN OK\n')

  // ── Create test fixtures ──────────────────────────────────────────────
  const tmpDir = path.join(__dirname, 'import-e2e-fixtures')
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })

  // CSV with semicolon
  fs.writeFileSync(path.join(tmpDir, 'csv-pt.csv'), 'codigo_barras;nome;preco;estoque\n111;CSV PT Produto;25.50;100\n222;CSV PT Produto 2;30.00;50\n')

  // CSV with comma
  fs.writeFileSync(path.join(tmpDir, 'csv-en.csv'), 'barcode,name,price,stock\n333,CSV EN Product,15.00,80\n444,CSV EN Product 2,20.00,60\n')

  // JSON
  fs.writeFileSync(path.join(tmpDir, 'products.json'), JSON.stringify([
    { barcode: '555', name: 'JSON Product', price: '40.00', stock: '30' },
    { barcode: '666', name: 'JSON Product 2', price: '55.00', stock: '20' },
  ]))

  // XML
  fs.writeFileSync(path.join(tmpDir, 'products.xml'), `<?xml version="1.0"?>
    <products>
      <product><barcode>777</barcode><name>XML Product</name><price>60.00</price></product>
      <product><barcode>888</barcode><name>XML Product 2</name><price>70.00</price></product>
    </products>`)

  // ── Test: Analyze CSV ─────────────────────────────────────────────────
  const csvAnalyze = await multipartUpload('POST', '/api/products/import/analyze', path.join(tmpDir, 'csv-pt.csv'), token)
  if (csvAnalyze.s === 200 && csvAnalyze.j?.success) {
    PASS++; console.log('PASS  ' + csvAnalyze.s + '  POST /api/products/import/analyze (CSV) ✓')
  } else {
    FAIL++; console.log('FAIL  ' + csvAnalyze.s + '  POST /api/products/import/analyze (CSV) → ' + (csvAnalyze.j?.error?.message || csvAnalyze.raw))
  }

  // ── Test: Analyze JSON ────────────────────────────────────────────────
  const jsonAnalyze = await multipartUpload('POST', '/api/products/import/analyze', path.join(tmpDir, 'products.json'), token)
  if (jsonAnalyze.s === 200 && jsonAnalyze.j?.success) {
    PASS++; console.log('PASS  ' + jsonAnalyze.s + '  POST /api/products/import/analyze (JSON) ✓')
  } else {
    FAIL++; console.log('FAIL  ' + jsonAnalyze.s + '  POST /api/products/import/analyze (JSON) → ' + (jsonAnalyze.j?.error?.message || jsonAnalyze.raw))
  }

  // ── Test: Analyze XML ─────────────────────────────────────────────────
  const xmlAnalyze = await multipartUpload('POST', '/api/products/import/analyze', path.join(tmpDir, 'products.xml'), token)
  if (xmlAnalyze.s === 200 && xmlAnalyze.j?.success) {
    PASS++; console.log('PASS  ' + xmlAnalyze.s + '  POST /api/products/import/analyze (XML) ✓')
  } else {
    FAIL++; console.log('FAIL  ' + xmlAnalyze.s + '  POST /api/products/import/analyze (XML) → ' + (xmlAnalyze.j?.error?.message || xmlAnalyze.raw))
  }

  // ── Test: Import CSV (semicolon) ──────────────────────────────────────
  const csvImport = await multipartUpload('POST', '/api/products/import', path.join(tmpDir, 'csv-pt.csv'), token)
  if (csvImport.s === 200 && csvImport.j?.success) {
    PASS++; console.log('PASS  ' + csvImport.s + '  POST /api/products/import (CSV semicolon) ✓ created=' + csvImport.j.data?.stats?.created)
  } else {
    FAIL++; console.log('FAIL  ' + csvImport.s + '  POST /api/products/import (CSV) → ' + (csvImport.j?.error?.message || csvImport.raw))
  }

  // ── Test: Import JSON ─────────────────────────────────────────────────
  const jsonImport = await multipartUpload('POST', '/api/products/import', path.join(tmpDir, 'products.json'), token)
  if (jsonImport.s === 200 && jsonImport.j?.success) {
    PASS++; console.log('PASS  ' + jsonImport.s + '  POST /api/products/import (JSON) ✓ created=' + jsonImport.j.data?.stats?.created)
  } else {
    FAIL++; console.log('FAIL  ' + jsonImport.s + '  POST /api/products/import (JSON) → ' + (jsonImport.j?.error?.message || jsonImport.raw))
  }

  // ── Test: Import XML ──────────────────────────────────────────────────
  const xmlImport = await multipartUpload('POST', '/api/products/import', path.join(tmpDir, 'products.xml'), token)
  if (xmlImport.s === 200 && xmlImport.j?.success) {
    PASS++; console.log('PASS  ' + xmlImport.s + '  POST /api/products/import (XML) ✓ created=' + xmlImport.j.data?.stats?.created)
  } else {
    FAIL++; console.log('FAIL  ' + xmlImport.s + '  POST /api/products/import (XML) → ' + (xmlImport.j?.error?.message || xmlImport.raw))
  }

  // ── Test: Analyze unsupported format ──────────────────────────────────
  fs.writeFileSync(path.join(tmpDir, 'fake.csv'), 'NOT ACTUALLY CSV ' + Date.now())
  const fakeAnalyze = await multipartUpload('POST', '/api/products/import/analyze', path.join(tmpDir, 'fake.csv'), token)
  if (fakeAnalyze.s === 400 && !fakeAnalyze.j?.success) {
    PASS++; console.log('PASS  ' + fakeAnalyze.s + '  POST /api/products/import/analyze (unsupported) correctly rejected ✓')
  } else {
    FAIL++; console.log('FAIL  ' + fakeAnalyze.s + '  POST /api/products/import/analyze (unsupported) → expected 400')
  }

  // ── Test: Save import profile ─────────────────────────────────────────
  const profileSave = await req('POST', '/api/products/import/profiles', {
    name: 'Test Profile',
    description: 'Auto-mapped CSV profile',
    mapping: { name: 'nome', barcode: 'codigo_barras', price: 'preco' },
  }, token)
  if (profileSave.s === 201 && profileSave.j?.success) {
    PASS++; console.log('PASS  ' + profileSave.s + '  POST /api/products/import/profiles ✓')
  } else {
    FAIL++; console.log('FAIL  ' + profileSave.s + '  POST /api/products/import/profiles → ' + (profileSave.j?.error?.message || profileSave.raw))
  }

  // ── Test: List import profiles ────────────────────────────────────────
  const profileList = await req('GET', '/api/products/import/profiles', null, token)
  if (profileList.s === 200 && profileList.j?.success) {
    PASS++; console.log('PASS  ' + profileList.s + '  GET /api/products/import/profiles ✓')
  } else {
    FAIL++; console.log('FAIL  ' + profileList.s + '  GET /api/products/import/profiles → ' + (profileList.j?.error?.message || profileList.raw))
  }

  // ── Cleanup ───────────────────────────────────────────────────────────
  fs.rmSync(tmpDir, { recursive: true, force: true })

  // ── Summary ───────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════')
  console.log('TOTAL: ' + (PASS + FAIL) + '  |  PASS: ' + PASS + '  |  FAIL: ' + FAIL)
  console.log('═══════════════════════════════════════')
  process.exit(FAIL > 0 ? 1 : 0)
}

main().catch(e => { console.error(e); process.exit(1) })
