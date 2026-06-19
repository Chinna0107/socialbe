/**
 * seed-data.js
 * Creates sample Campaigns, Tasks (under each campaign), and Donations via admin API.
 * Usage: node seed-data.js
 */

const http = require('http');
require('dotenv').config();

const BASE = `http://localhost:${process.env.PORT || 5000}`;

// ─── HTTP Helper ───────────────────────────────────────────────────────────────
function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE + path);
    const opts = {
      hostname: url.hostname,
      port:     url.port,
      path:     url.pathname + url.search,
      method,
      headers:  { 'Content-Type': 'application/json' },
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

function log(emoji, label, value = '') {
  console.log(`  ${emoji} ${label}${value ? ': ' + value : ''}`);
}

// ─── Seed Data ─────────────────────────────────────────────────────────────────

const CAMPAIGNS = [
  {
    title:       'Clean Water for All',
    description: 'Providing clean drinking water to rural communities across developing regions.',
    goal:        50000,
    tag:         'environment',
    image:       'https://example.com/images/clean-water.jpg',
  },
  {
    title:       'Education First Initiative',
    description: 'Scholarships and learning materials for underprivileged students.',
    goal:        30000,
    tag:         'education',
    image:       'https://example.com/images/education.jpg',
  },
  {
    title:       'Plant 1 Million Trees',
    description: 'Reforestation campaign targeting deforested areas across three continents.',
    goal:        75000,
    tag:         'environment',
    image:       'https://example.com/images/trees.jpg',
  },
];

const TASKS_PER_CAMPAIGN = [
  [
    { title: 'Share campaign on social media', description: 'Post about Clean Water campaign on any social platform and submit a screenshot.', priority: 'medium', points: 20 },
    { title: 'Volunteer registration form',    description: 'Fill and submit the volunteer registration form linked in the campaign page.',    priority: 'high',   points: 50 },
    { title: 'Write a 200-word blog post',     description: 'Write a short blog or article about water scarcity and share the link.',          priority: 'low',    points: 30 },
  ],
  [
    { title: 'Refer a student',             description: 'Refer at least one student who needs a scholarship and submit their contact info.',  priority: 'high',   points: 60 },
    { title: 'Upload study materials',      description: 'Share any useful study notes or resources in the campaign group.',                   priority: 'medium', points: 25 },
    { title: 'Complete awareness quiz',     description: 'Finish the Education Awareness Quiz with a score of 70% or above.',                  priority: 'low',    points: 15 },
  ],
  [
    { title: 'Plant a tree and photo proof', description: 'Plant at least one tree and upload a geotagged photo as proof.',                   priority: 'high',   points: 80 },
    { title: 'Organise a local drive',       description: 'Organise or participate in a local tree-planting drive and document it.',           priority: 'high',   points: 100 },
    { title: 'Share reforestation facts',    description: 'Create and post an infographic about deforestation on social media.',              priority: 'medium', points: 20 },
  ],
];

const DONORS = [
  { name: 'Alice Johnson',  email: 'alice@example.com',  amounts: [500,  250] },
  { name: 'Bob Martinez',   email: 'bob@example.com',    amounts: [1000, 750] },
  { name: 'Carol White',    email: 'carol@example.com',  amounts: [200,  300] },
  { name: 'David Lee',      email: 'david@example.com',  amounts: [5000]      },
  { name: 'Emma Thompson',  email: 'emma@example.com',   amounts: [150,  450] },
];

// ─── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  console.log('🌱 Social News — Seed Script');
  console.log('==============================\n');

  // 1. Admin login
  console.log('🔑 Logging in as admin...');
  const loginRes = await request('POST', '/api/auth/admin-login', {
    email:    'admin@socialnews.com',
    password: 'Admin@123',
  });
  if (loginRes.status !== 200) {
    console.error('❌ Admin login failed:', JSON.stringify(loginRes.body));
    process.exit(1);
  }
  const token = loginRes.body.token;
  console.log('  ✅ Authenticated\n');

  // 2. Create Campaigns
  console.log('📢 Creating Campaigns...');
  const campaignIds = [];
  for (const camp of CAMPAIGNS) {
    const res = await request('POST', '/api/admin/campaigns', camp, token);
    if (res.status === 201) {
      campaignIds.push(res.body.id);
      log('✅', res.body.title, res.body.id);
    } else {
      log('❌', camp.title, JSON.stringify(res.body));
    }
  }

  // 3. Create Tasks per Campaign
  console.log('\n📋 Creating Tasks...');
  const taskIds = [];
  for (let i = 0; i < campaignIds.length; i++) {
    const campId = campaignIds[i];
    for (const task of TASKS_PER_CAMPAIGN[i] || []) {
      const res = await request('POST', '/api/admin/tasks', { ...task, campaign_id: campId }, token);
      if (res.status === 201) {
        taskIds.push(res.body.id);
        log('✅', `[${campId}] ${res.body.title}`, res.body.id);
      } else {
        log('❌', task.title, JSON.stringify(res.body));
      }
    }
  }

  // 4. Create Donations (public endpoint — no token needed)
  console.log('\n💰 Creating Donations...');
  let donorIdx = 0;
  for (const campId of campaignIds) {
    const donor = DONORS[donorIdx % DONORS.length];
    for (const amount of donor.amounts) {
      const res = await request('POST', '/api/donations/donate', {
        campaign_id: campId,
        amount,
        donor_name:  donor.name,
        donor_email: donor.email,
        message:     `Supporting ${campId} — automated seed`,
      });
      if (res.status === 201) {
        log('✅', `${donor.name} → ${campId}`, `$${amount} (${res.body.id})`);
      } else {
        log('❌', `${donor.name} → ${campId}`, JSON.stringify(res.body));
      }
    }
    donorIdx++;
  }

  // 5. Mark donations as completed via admin
  console.log('\n✔️  Marking donations as completed...');
  const donationsRes = await request('GET', '/api/admin/donations?limit=50', null, token);
  if (donationsRes.status === 200) {
    for (const d of donationsRes.body.donations) {
      if (d.status === 'pending') {
        const upd = await request('PATCH', `/api/donations/${d.id}/status`, { status: 'completed' }, token);
        if (upd.status === 200) log('✅', `Completed`, d.id);
        else                    log('❌', `Failed to complete ${d.id}`, JSON.stringify(upd.body));
      }
    }
  } else {
    log('⚠️', 'Could not fetch donations to mark completed');
  }

  // 6. Summary
  console.log('\n==============================');
  console.log('📊 Seed Summary');
  console.log(`  Campaigns : ${campaignIds.length}`);
  console.log(`  Tasks     : ${taskIds.length}`);
  console.log(`  Campaign IDs:`);
  campaignIds.forEach((id) => console.log(`    • ${id}`));
  console.log('\n✅ Done! You can now run: node test-marketplace-campaigns.js');
})();
