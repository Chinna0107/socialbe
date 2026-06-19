const http = require('http');
require('dotenv').config();

const BASE_URL = `http://localhost:${process.env.PORT || 5000}`;
let adminToken = '';
let createdCampaignId = '';
let createdProductId = '';

// ─── HTTP Helper ───────────────────────────────────────────────────────────────
function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const opts = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ─── Test Runner ───────────────────────────────────────────────────────────────
let passed = 0, failed = 0;
function test(name, fn) {
  return fn()
    .then(() => { console.log(`  ✅ ${name}`); passed++; })
    .catch((e) => { console.log(`  ❌ ${name}: ${e.message}`); failed++; });
}
function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed');
}

// ─── Test Suites ───────────────────────────────────────────────────────────────

async function setupAdminToken() {
  const res = await request('POST', '/api/auth/admin-login', {
    email: 'admin@socialnews.com',
    password: 'Admin@123',
  });
  assert(res.status === 200, `Admin login failed (${res.status}): ${JSON.stringify(res.body)}`);
  adminToken = res.body.token;
}

// ── Public Campaigns ──────────────────────────────────────────────────────────
async function testPublicCampaigns() {
  console.log('\n📢 Public Campaigns');

  await test('GET /api/campaigns - returns array', async () => {
    const res = await request('GET', '/api/campaigns');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.body), 'Expected array');
  });

  await test('GET /api/campaigns/:id - 404 for unknown id', async () => {
    const res = await request('GET', '/api/campaigns/NONEXISTENT');
    assert(res.status === 404, `Expected 404, got ${res.status}`);
  });
}

// ── Admin Campaigns ───────────────────────────────────────────────────────────
async function testAdminCampaigns() {
  console.log('\n🛠  Admin Campaigns');

  await test('POST /api/admin/campaigns - create campaign', async () => {
    const res = await request('POST', '/api/admin/campaigns', {
      title: 'Test Campaign',
      description: 'Automated test campaign',
      goal: 10000,
      tag: 'test',
    }, adminToken);
    assert(res.status === 201, `Expected 201, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert(res.body.id, 'Expected id in response');
    createdCampaignId = res.body.id;
  });

  await test('GET /api/admin/campaigns - list campaigns', async () => {
    const res = await request('GET', '/api/admin/campaigns', null, adminToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.body.campaigns), 'Expected campaigns array');
    assert(typeof res.body.total === 'number', 'Expected total');
  });

  await test('GET /api/admin/campaigns?status=active - filter by status', async () => {
    const res = await request('GET', '/api/admin/campaigns?status=active', null, adminToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });

  await test('PUT /api/admin/campaigns/:id - update campaign', async () => {
    const res = await request('PUT', `/api/admin/campaigns/${createdCampaignId}`, {
      title: 'Updated Campaign',
      description: 'Updated desc',
      goal: 20000,
      tag: 'updated',
      status: 'active',
    }, adminToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.title === 'Updated Campaign', 'Title not updated');
  });

  await test('GET /api/campaigns/:id - public access to created campaign', async () => {
    const res = await request('GET', `/api/campaigns/${createdCampaignId}`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.id === createdCampaignId, 'Campaign id mismatch');
  });

  await test('DELETE /api/admin/campaigns/:id - archive campaign', async () => {
    const res = await request('DELETE', `/api/admin/campaigns/${createdCampaignId}`, null, adminToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.message, 'Expected message');
  });

  await test('GET /api/admin/campaigns - no token returns 401', async () => {
    const res = await request('GET', '/api/admin/campaigns');
    assert(res.status === 401, `Expected 401, got ${res.status}`);
  });
}

// ── Public Marketplace ────────────────────────────────────────────────────────
async function testPublicMarketplace() {
  console.log('\n🛒 Public Marketplace');

  await test('GET /api/marketplace - returns active products', async () => {
    const res = await request('GET', '/api/marketplace');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.body), 'Expected array');
  });

  await test('GET /api/marketplace?category=books - filter by category', async () => {
    const res = await request('GET', '/api/marketplace?category=books');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.body), 'Expected array');
  });

  await test('GET /api/marketplace?limit=5 - limit param', async () => {
    const res = await request('GET', '/api/marketplace?limit=5');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.length <= 5, 'Expected at most 5 results');
  });

  await test('GET /api/marketplace/:id - 404 for unknown product', async () => {
    const res = await request('GET', '/api/marketplace/NONEXISTENT');
    assert(res.status === 404, `Expected 404, got ${res.status}`);
  });
}

// ── Admin Marketplace (Products) ──────────────────────────────────────────────
async function testAdminMarketplace() {
  console.log('\n📦 Admin Marketplace / Products');

  await test('POST /api/admin/marketplace - create product', async () => {
    const res = await request('POST', '/api/admin/marketplace', {
      name: 'Test Product',
      description: 'Automated test product',
      price: 99.99,
      stock: 50,
      category: 'books',
    }, adminToken);
    assert(res.status === 201, `Expected 201, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert(res.body.id, 'Expected id');
    createdProductId = res.body.id;
  });

  await test('GET /api/admin/marketplace - list products', async () => {
    const res = await request('GET', '/api/admin/marketplace', null, adminToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.body.products), 'Expected products array');
    assert(typeof res.body.total === 'number', 'Expected total');
  });

  await test('GET /api/admin/marketplace?category=books - filter', async () => {
    const res = await request('GET', '/api/admin/marketplace?category=books', null, adminToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });

  await test('PUT /api/admin/marketplace/:id - update product', async () => {
    const res = await request('PUT', `/api/admin/marketplace/${createdProductId}`, {
      name: 'Updated Product',
      description: 'Updated desc',
      price: 149.99,
      stock: 30,
      category: 'books',
      status: 'active',
    }, adminToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.name === 'Updated Product', 'Name not updated');
  });

  await test('GET /api/marketplace/:id - public access to created product', async () => {
    const res = await request('GET', `/api/marketplace/${createdProductId}`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.id === createdProductId, 'Product id mismatch');
  });

  await test('DELETE /api/admin/marketplace/:id - deactivate product', async () => {
    const res = await request('DELETE', `/api/admin/marketplace/${createdProductId}`, null, adminToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.message, 'Expected message');
  });

  await test('GET /api/admin/marketplace - no token returns 401', async () => {
    const res = await request('GET', '/api/admin/marketplace');
    assert(res.status === 401, `Expected 401, got ${res.status}`);
  });
}

// ─── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  console.log('🧪 Marketplace & Campaigns Test Suite');
  console.log('=====================================');

  try {
    console.log('\n🔑 Authenticating admin...');
    await setupAdminToken();
    console.log('  ✅ Admin token acquired');

    await testPublicCampaigns();
    await testAdminCampaigns();
    await testPublicMarketplace();
    await testAdminMarketplace();

    console.log(`\n=====================================`);
    console.log(`Results: ${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('\n💥 Setup failed:', err.message);
    process.exit(1);
  }
})();
