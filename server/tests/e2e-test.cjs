/**
 * Comprehensive E2E API test — all endpoints with auth
 * Run: node server/tests/e2e-test.cjs
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE = 'localhost:3000';
let PASS = 0, FAIL = 0;

async function req(method, path_, body, token) {
  const opts = { hostname:'localhost', port:3000, path:path_, method,
    headers:{'Content-Type':'application/json'} };
  if (token) opts.headers['Authorization'] = 'Bearer ' + token;
  const bodyStr = body ? JSON.stringify(body) : null;
  return new Promise((resolve) => {
    const r = http.request(opts, (res) => {
      let d='';
      res.on('data', c=>d+=c);
      res.on('end', ()=>{
        try { resolve({s:res.statusCode, j:JSON.parse(d)}); }
        catch(e) { resolve({s:res.statusCode, raw:d.slice(0,200)}); }
      });
    });
    r.on('error', e => resolve({s:0, err:e.message}));
    if (bodyStr) r.write(bodyStr);
    r.end();
  });
}

function multipartUpload(method, path_, filePath, token) {
  return new Promise((resolve) => {
    const buf = fs.readFileSync(filePath);
    const boundary = '----FormBoundary7MA4YWxkTrZu0gW';
    const fn = path.basename(filePath);
    const body = '--'+boundary+'\r\nContent-Disposition: form-data; name="file"; filename="'+fn+'"\r\nContent-Type: text/csv\r\n\r\n'+buf.toString()+'\r\n--'+boundary+'--\r\n';
    const opts = { hostname:'localhost', port:3000, path:path_, method,
      headers:{'Content-Type':'multipart/form-data; boundary='+boundary, 'Authorization':'Bearer '+token} };
    const r = http.request(opts, (res) => {
      let d='';
      res.on('data',c=>d+=c);
      res.on('end',()=>{ try{resolve({s:res.statusCode,j:JSON.parse(d)})}catch(e){resolve({s:res.statusCode,raw:d.slice(0,200)})} });
    });
    r.on('error', e=>resolve({s:0,err:e.message}));
    r.write(body);
    r.end();
  });
}

async function main() {
  // ── Login ───────────────────────────────────────────────────────────────
  const login = await req('POST','/api/auth/login',{email:'admin@fabulove.com',password:'Admin@12345'});
  const token = login.j?.accessToken;
  if (!token) { console.log('FAIL: login'); process.exit(1); }
  console.log('LOGIN OK\n');

  // ── Tests ───────────────────────────────────────────────────────────────
  const e2eSku = 'E2E-' + Date.now();
  const e2eBarcode = '999' + Date.now().toString().slice(-4);
  const tests = [
    // Dashboard
    {name:'GET /api/dashboard', m:'GET', p:'/api/dashboard'},
    // Categories
    {name:'GET /api/categories', m:'GET', p:'/api/categories'},
    // Products list
    {name:'GET /api/products?limit=5', m:'GET', p:'/api/products?limit=5'},
    // Products create — SKU e barcode únicos por execução
    {name:'POST /api/products', m:'POST', p:'/api/products', b:{name:'Prod E2E Teste',sku:e2eSku,barcode:e2eBarcode,price:15,cost:8,stock:50}},
    // POS products search
    {name:'GET /api/pos/products/search?q=&limit=5', m:'GET', p:'/api/pos/products/search?q=&limit=5'},
    // POS products by barcode — usa barcode do produto criado no mesmo teste
    {name:'GET /api/pos/products/by-barcode/'+e2eBarcode, m:'GET', p:'/api/pos/products/by-barcode/'+e2eBarcode},
    // POS cash register active
    {name:'GET /api/pos/cash/register/active', m:'GET', p:'/api/pos/cash/register/active'},
    // POS cash register open
    {name:'POST /api/pos/cash/register/open', m:'POST', p:'/api/pos/cash/register/open', b:{}},
    // POS carts list
    {name:'GET /api/pos/carts', m:'GET', p:'/api/pos/carts'},
    // POS carts create
    {name:'POST /api/pos/carts', m:'POST', p:'/api/pos/carts', b:{customerId:null,notes:''}},
    // POS sales list
    {name:'GET /api/pos/sales', m:'GET', p:'/api/pos/sales'},
    // POS sales saved
    {name:'GET /api/pos/sales/saved', m:'GET', p:'/api/pos/sales/saved'},
    // POS daily report
    {name:'GET /api/pos/reports/daily?date=2026-10-19', m:'GET', p:'/api/pos/reports/daily?date=2026-10-19'},
    // Financial summary
    {name:'GET /api/financial/summary', m:'GET', p:'/api/financial/summary'},
    // Financial receivable (singular!)
    {name:'GET /api/financial/receivable', m:'GET', p:'/api/financial/receivable'},
    // Financial payable (singular!)
    {name:'GET /api/financial/payable', m:'GET', p:'/api/financial/payable'},
    // Financial cash
    {name:'GET /api/financial/cash', m:'GET', p:'/api/financial/cash'},
    // Reports sales
    {name:'GET /api/reports/sales?start_date=2026-01-01&end_date=2026-12-31', m:'GET', p:'/api/reports/sales?start_date=2026-01-01&end_date=2026-12-31'},
    // Reports stock
    {name:'GET /api/reports/stock', m:'GET', p:'/api/reports/stock'},
    // POS sales saved
    {name:'GET /api/pos/sales/saved', m:'GET', p:'/api/pos/sales/saved'},
    // POS daily report
    {name:'GET /api/marketplaces/shopee/status', m:'GET', p:'/api/marketplaces/shopee/status'},
    // Customers
    {name:'GET /api/customers', m:'GET', p:'/api/customers'},
    // Suppliers
    {name:'GET /api/suppliers', m:'GET', p:'/api/suppliers'},
    // Orders
    {name:'GET /api/orders', m:'GET', p:'/api/orders'},
  ];

  // Capture product ID for later delete
  let createdProductId = null;
  let cartId = null;
  let registerId = null;

  for (const t of tests) {
    const r = await req(t.m, t.p, t.b, token);
    const ok = r.s >= 200 && r.s < 300 && typeof r.j === 'object' && r.j.success !== undefined;
    if (ok) {
      PASS++;
      console.log('PASS  ' + r.s + '  ' + t.name);
      if (t.name.includes('POST /api/products') && r.j.data && r.j.data.id) createdProductId = r.j.data.id;
      if (t.name.includes('POST /api/pos/carts') && r.j.data && r.j.data.id) cartId = r.j.data.id;
      if (t.name.includes('POST /api/pos/cash/register/open') && r.j.data && r.j.data.id) registerId = r.j.data.id;
    } else {
      FAIL++;
      const detail = r.j?.error?.message || (typeof r.j==='object'?JSON.stringify(r.j).slice(0,100):r.raw);
      console.log('FAIL  ' + r.s + '  ' + t.name + '  → ' + detail);
    }
  }

  // ── CSV Import ──────────────────────────────────────────────────────────
  const csvPath = path.join(__dirname, 'mock-import.csv');
  fs.writeFileSync(csvPath, 'barcode,name,price,stock\ntest999,Produto Teste E2E,25.00,100\ntest998,Produto Teste 02,30.00,50\n');
  const imp = await multipartUpload('POST','/api/products/import',csvPath,token);
  const impOk = imp.s===200 && imp.j?.success;
  if (impOk) { PASS++; console.log('PASS  ' + imp.s + '  POST /api/products/import ✓'); }
  else { FAIL++; console.log('FAIL  ' + imp.s + '  POST /api/products/import → ' + (imp.j?.error?.message||imp.raw)); }

  // ── Full PDV flow ───────────────────────────────────────────────────────
  console.log('\n── PDV Full Flow ────────────────────────────────────');

  // Open register if not yet opened
  if (!registerId) {
    const r = await req('POST','/api/pos/cash/register/open',{},token);
    if (r.s===201 && r.j?.success) { registerId=r.j.data.id; console.log('  Register opened id='+registerId); }
    else { console.log('  Register open FAILED:', r.s, r.j?.error?.message||r.raw); FAIL++; }
  }

  // Create cart
  const cartR = await req('POST','/api/pos/carts',{},token);
  if (cartR.s===201 && cartR.j?.success) { cartId=cartR.j.data.id; console.log('  Cart created id='+cartId); }
  else { console.log('  Cart create FAILED:', cartR.s); FAIL++; }

  // Add item to cart
  if (cartId) {
    const itemR = await req('POST',`/api/pos/carts/${cartId}/items`,{productId:createdProductId||1,quantity:2},token);
    if (itemR.s>=200 && itemR.s<300 && itemR.j?.success) { console.log('  Item added to cart ✓'); PASS++; }
    else { console.log('  Add item FAILED:', itemR.s, itemR.j?.error?.message||itemR.raw); FAIL++; }
  }

  // Complete sale
  if (cartId && registerId) {
    const completeR = await req('POST',`/api/pos/carts/${cartId}/complete`,{paymentMethod:'cash',cashRegisterId:registerId,amountPaid:100},token);
    if (completeR.s>=200 && completeR.s<300 && completeR.j?.success) { console.log('  Sale completed ✓'); PASS++; }
    else { console.log('  Complete sale FAILED:', completeR.s, completeR.j?.error?.message||completeR.raw); FAIL++; }
  }

  // ── Close register ──────────────────────────────────────────────────────
  if (registerId) {
    const closeR = await req('POST',`/api/pos/cash/register/${registerId}/close`,{},token);
    if (closeR.s===200 && closeR.j?.success) { console.log('  Register closed ✓'); PASS++; }
    else { console.log('  Close register:', closeR.s, closeR.j?.error?.message||closeR.raw); }
  }

  // ── Cleanup ─────────────────────────────────────────────────────────────
  if (createdProductId) {
    await req('DELETE',`/api/products/${createdProductId}`,null,token);
    console.log('  Cleaned up test product');
  }
  fs.unlinkSync(csvPath);

  // ── Summary ─────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════');
  console.log('TOTAL: ' + (PASS+FAIL) + '  |  PASS: ' + PASS + '  |  FAIL: ' + FAIL);
  console.log('═══════════════════════════════════════');
  process.exit(FAIL>0?1:0);
}
main().catch(e=>{ console.error(e); process.exit(1); });
