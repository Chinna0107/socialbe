const pool = require('./db');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function seed() {
  // ── Users ──────────────────────────────────────────────────────────────────
  const adminHash    = await bcrypt.hash('Admin@123', 10);
  const userHash     = await bcrypt.hash('User@123', 10);
  const studentHash  = await bcrypt.hash('Student@123', 10);

  await pool.query(
    'INSERT INTO admins (name, email, password) VALUES ($1,$2,$3) ON CONFLICT (email) DO NOTHING',
    ['Super Admin', 'admin@socialnews.com', adminHash]
  );

  await pool.query(
    `INSERT INTO users (name, email, password, role, student_id, phone, impact_points, level)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (email) DO NOTHING`,
    ['John Doe', 'user@socialnews.com', userHash, 'user', 'USR001', '+1234567890', 50, 'Level 1']
  );

  await pool.query(
    `INSERT INTO users (name, email, password, role, student_id, phone, impact_points, level)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (email) DO NOTHING`,
    ['Jane Smith', 'student@socialnews.com', studentHash, 'student', 'STU001', '+1987654321', 150, 'Level 2']
  );

  // ── News Articles ──────────────────────────────────────────────────────────
  const articles = [
    ['ART001', 'India Launches Major Clean Energy Initiative', 'Government announces $10B investment in solar and wind power projects across 12 states.', 'The Ministry of New and Renewable Energy today unveiled an ambitious clean energy initiative worth $10 billion, targeting solar and wind power installations across 12 states. The project aims to add 50 GW of renewable capacity by 2027.', 'Environment', 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800', 'Priya Sharma', true, true],
    ['ART002', 'Youth Voter Registration Drives Hit Record Numbers', 'Over 2 million young voters registered ahead of upcoming state elections.', 'Civic organizations report unprecedented success in youth voter registration campaigns, with more than 2 million new voters between 18-25 registered in the last quarter alone.', 'Politics', 'https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=800', 'Rahul Verma', false, true],
    ['ART003', 'Community Kitchen Network Feeds 50,000 Daily', 'A volunteer-driven initiative now operates 120 kitchens across urban slums.', 'What started as a small volunteer project in Mumbai three years ago has grown into a nationwide network of 120 community kitchens serving over 50,000 meals daily to underprivileged communities.', 'Social', 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800', 'Anita Nair', false, true],
    ['ART004', 'Digital Literacy Program Reaches Rural India', 'Govt-NGO partnership trains 1 million rural citizens in basic digital skills.', 'A landmark partnership between the government and 45 NGOs has successfully trained over 1 million rural citizens in digital literacy, covering smartphone usage, online banking, and e-government services.', 'Technology', 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800', 'Suresh Kumar', true, true],
    ['ART005', 'New Education Policy Shows Early Positive Results', 'Student dropout rates fall by 18% in pilot districts implementing NEP 2020.', 'Districts implementing the New Education Policy 2020 framework are reporting an 18% reduction in school dropout rates, with improved learning outcomes in foundational literacy and numeracy assessments.', 'Education', 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800', 'Meera Pillai', false, true],
    ['ART006', 'Water Conservation Campaign Saves 10 Billion Litres', 'Community-led watershed management transforms drought-prone villages.', 'A grassroots water conservation campaign spanning 400 villages has collectively saved an estimated 10 billion litres of water through rainwater harvesting, check dams, and drip irrigation adoption.', 'Environment', 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800', 'Vikram Singh', false, true],
    ['ART007', 'Startup Ecosystem Sees Record ₹1.2 Lakh Crore Funding', 'Indian startups attract historic investment levels in Q3 2025.', 'Indian startups raised a record ₹1.2 lakh crore in Q3 2025, with fintech, healthtech, and agritech leading the charge. Investors cite improving regulatory environment and deep talent pool as key factors.', 'Business', 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800', 'Deepa Menon', true, true],
    ['ART008', 'Women Self-Help Groups Transforming Rural Economy', 'SHG members now manage ₹8,000 crore in micro-loans across 5 states.', 'Women self-help groups in five states are now collectively managing over ₹8,000 crore in micro-loans, with a repayment rate of 98.5%. The initiative has lifted an estimated 3 lakh families above the poverty line.', 'Social', 'https://images.unsplash.com/photo-1573497620053-ea5300f94f21?w=800', 'Lakshmi Rao', false, true],
  ];

  for (const a of articles) {
    await pool.query(
      `INSERT INTO articles (id, title, excerpt, content, category, image, author, is_breaking, is_published)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING`,
      a
    );
  }

  // ── Marketplace Products ───────────────────────────────────────────────────
  const products = [
    ['PRD001', 'Social News Tote Bag', 'Eco-friendly cotton tote bag with Social News branding. Perfect for daily use.', 299, 'https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?w=800', 100, 'Merchandise'],
    ['PRD002', 'Civic Leader Hoodie', 'Premium quality hoodie with embroidered Social News logo. Available in all sizes.', 899, 'https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=800', 50, 'Apparel'],
    ['PRD003', 'Impact Journal', 'A5 hardcover journal with 200 pages, bookmark ribbon and motivational quotes inside.', 199, 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800', 200, 'Stationery'],
    ['PRD004', 'Social Change Mug', 'Ceramic 350ml mug with inspiring civic engagement quotes. Microwave & dishwasher safe.', 249, 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800', 150, 'Merchandise'],
    ['PRD005', 'Volunteer Starter Kit', 'Kit includes ID card holder, badge, notepad, pen, and Social News sticker pack.', 499, 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800', 75, 'Kits'],
    ['PRD006', 'Bamboo Pen Set (3pc)', 'Eco-friendly bamboo pens with smooth ink. Sustainable choice for civic leaders.', 149, 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=800', 300, 'Stationery'],
    ['PRD007', 'Social News Cap', 'Adjustable snapback cap with embroidered logo. One size fits all.', 349, 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=800', 80, 'Apparel'],
    ['PRD008', 'Community Action Poster Set', 'Set of 5 A3 motivational posters for community centers, schools, and offices.', 399, 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800', 120, 'Stationery'],
    ['PRD009', 'Reusable Water Bottle (750ml)', 'Stainless steel double-wall insulated bottle with Social News branding.', 599, 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800', 90, 'Merchandise'],
    ['PRD010', 'Digital Citizen Handbook', 'Printed guide covering digital rights, online safety, and civic tech tools. 120 pages.', 179, 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800', 250, 'Books'],
  ];

  for (const p of products) {
    await pool.query(
      `INSERT INTO products (id, name, description, price, image, stock, category, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'active') ON CONFLICT (id) DO NOTHING`,
      p
    );
  }

  console.log('\n✅ Seed complete!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔐 ADMIN');
  console.log('   Email   : admin@socialnews.com');
  console.log('   Password: Admin@123');
  console.log('   Endpoint: POST /api/auth/admin-login');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('👤 USER');
  console.log('   Email   : user@socialnews.com');
  console.log('   Password: User@123');
  console.log('   Endpoint: POST /api/auth/login');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎓 STUDENT');
  console.log('   Email   : student@socialnews.com');
  console.log('   Password: Student@123');
  console.log('   Endpoint: POST /api/auth/login');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📰 News articles seeded : ${articles.length}`);
  console.log(`🛍️  Marketplace products : ${products.length}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  process.exit(0);
}

seed().catch(err => { console.error('❌', err.message); process.exit(1); });
