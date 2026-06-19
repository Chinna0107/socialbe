const pool = require('./db');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function setup() {
  await pool.query(`
    -- Users (students/civic leaders)
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      email VARCHAR(150) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(30) DEFAULT 'student',
      avatar TEXT,
      phone VARCHAR(15),
      impact_points INT DEFAULT 0,
      level VARCHAR(50) DEFAULT 'Level 1',
      student_id VARCHAR(30) UNIQUE,
      is_active BOOLEAN DEFAULT TRUE,
      updated_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    );

    -- Admins
    CREATE TABLE IF NOT EXISTS admins (
      id SERIAL PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      email VARCHAR(150) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    -- Campaigns
    CREATE TABLE IF NOT EXISTS campaigns (
      id VARCHAR(30) PRIMARY KEY,
      title VARCHAR(200) NOT NULL,
      description TEXT,
      image TEXT,
      goal NUMERIC(12,2) DEFAULT 0,
      collected NUMERIC(12,2) DEFAULT 0,
      tag VARCHAR(50),
      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT NOW()
    );

    -- Campaign Registrations
    CREATE TABLE IF NOT EXISTS campaign_registrations (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id),
      campaign_id VARCHAR(30) REFERENCES campaigns(id),
      registered_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, campaign_id)
    );

    -- Tasks
    CREATE TABLE IF NOT EXISTS tasks (
      id VARCHAR(30) PRIMARY KEY,
      title VARCHAR(200) NOT NULL,
      description TEXT,
      priority VARCHAR(20) DEFAULT 'Medium',
      points INT DEFAULT 100,
      status VARCHAR(20) DEFAULT 'active',
      campaign_id VARCHAR(30) REFERENCES campaigns(id),
      created_at TIMESTAMP DEFAULT NOW()
    );

    -- Task Assignments
    CREATE TABLE IF NOT EXISTS task_assignments (
      id SERIAL PRIMARY KEY,
      task_id VARCHAR(30) REFERENCES tasks(id),
      user_id INT REFERENCES users(id),
      status VARCHAR(20) DEFAULT 'PENDING',
      submission_image TEXT,
      rejection_reason TEXT,
      submitted_at TIMESTAMP,
      approved_at TIMESTAMP,
      points_earned INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(task_id, user_id)
    );

    -- Quizzes
    CREATE TABLE IF NOT EXISTS quizzes (
      id VARCHAR(30) PRIMARY KEY,
      title VARCHAR(200) NOT NULL,
      description TEXT,
      questions JSONB DEFAULT '[]',
      total_questions INT DEFAULT 0,
      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT NOW()
    );

    -- Quiz Attempts
    CREATE TABLE IF NOT EXISTS quiz_attempts (
      id SERIAL PRIMARY KEY,
      quiz_id VARCHAR(30) REFERENCES quizzes(id),
      user_id INT REFERENCES users(id),
      score INT DEFAULT 0,
      answers JSONB DEFAULT '[]',
      status VARCHAR(20) DEFAULT 'IN_PROGRESS',
      completed_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    );

    -- Certificates
    CREATE TABLE IF NOT EXISTS certificates (
      id VARCHAR(30) PRIMARY KEY,
      user_id INT REFERENCES users(id),
      title VARCHAR(200) NOT NULL,
      type VARCHAR(50) DEFAULT 'task',
      reference_id VARCHAR(30),
      issued_at TIMESTAMP DEFAULT NOW(),
      is_verified BOOLEAN DEFAULT TRUE
    );

    -- Donations
    CREATE TABLE IF NOT EXISTS donations (
      id VARCHAR(30) PRIMARY KEY,
      user_id INT REFERENCES users(id),
      campaign_id VARCHAR(30) REFERENCES campaigns(id),
      amount NUMERIC(10,2) NOT NULL,
      donor_name VARCHAR(150),
      donor_email VARCHAR(150),
      message TEXT,
      status VARCHAR(20) DEFAULT 'completed',
      created_at TIMESTAMP DEFAULT NOW()
    );

    -- Marketplace Products
    CREATE TABLE IF NOT EXISTS products (
      id VARCHAR(30) PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      description TEXT,
      price NUMERIC(10,2) NOT NULL,
      image TEXT,
      stock INT DEFAULT 0,
      category VARCHAR(50),
      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT NOW()
    );

    -- Orders
    CREATE TABLE IF NOT EXISTS orders (
      id VARCHAR(30) PRIMARY KEY,
      user_id INT REFERENCES users(id),
      items JSONB NOT NULL,
      total NUMERIC(10,2),
      address TEXT,
      status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW()
    );

    -- Notifications
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id),
      title VARCHAR(200),
      message TEXT,
      type VARCHAR(30) DEFAULT 'info',
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    );

    -- Enquiries
    CREATE TABLE IF NOT EXISTS enquiries (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id),
      name VARCHAR(150),
      email VARCHAR(150),
      subject VARCHAR(200),
      message TEXT,
      admin_note TEXT,
      status VARCHAR(20) DEFAULT 'open',
      updated_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    );

    -- Enquiry Replies (admin responses)
    CREATE TABLE IF NOT EXISTS enquiry_replies (
      id SERIAL PRIMARY KEY,
      enquiry_id INT REFERENCES enquiries(id) ON DELETE CASCADE,
      admin_id INT REFERENCES admins(id),
      message TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    -- Advertisement Banners
    CREATE TABLE IF NOT EXISTS banners (
      id SERIAL PRIMARY KEY,
      title VARCHAR(200),
      image TEXT,
      link TEXT,
      target_url TEXT,
      alt_text VARCHAR(200),
      position VARCHAR(30) DEFAULT 'header',
      start_date DATE,
      end_date DATE,
      is_active BOOLEAN DEFAULT TRUE,
      updated_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    );

    -- Google AdSense Supportive Slots
    CREATE TABLE IF NOT EXISTS adsense_slots (
      id SERIAL PRIMARY KEY,
      slot_name VARCHAR(100) NOT NULL,
      slot_id VARCHAR(100),
      publisher_id VARCHAR(100),
      slot_type VARCHAR(30) DEFAULT 'display',
      page_placement VARCHAR(100),
      ad_format VARCHAR(30) DEFAULT 'auto',
      ad_size_width INT,
      ad_size_height INT,
      custom_css TEXT,
      impressions INT DEFAULT 0,
      clicks INT DEFAULT 0,
      is_active BOOLEAN DEFAULT TRUE,
      is_test_mode BOOLEAN DEFAULT FALSE,
      updated_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    );

    -- Website Content (CMS)
    CREATE TABLE IF NOT EXISTS cms_sections (
      id SERIAL PRIMARY KEY,
      section_key VARCHAR(100) UNIQUE NOT NULL,
      title VARCHAR(200),
      content TEXT,
      metadata JSONB DEFAULT '{}',
      updated_at TIMESTAMP DEFAULT NOW()
    );

    -- AdSense Units
    CREATE TABLE IF NOT EXISTS adsense_units (
      id SERIAL PRIMARY KEY,
      label VARCHAR(100) NOT NULL,
      slot VARCHAR(100),
      client_id VARCHAR(100),
      ad_format VARCHAR(30) DEFAULT 'auto',
      position VARCHAR(50) DEFAULT 'sidebar',
      custom_html TEXT,
      impressions INT DEFAULT 0,
      clicks INT DEFAULT 0,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT NOW()
    );

    -- Activity Logs
    CREATE TABLE IF NOT EXISTS activity_logs (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id),
      action VARCHAR(100),
      details TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    -- Articles (News)
    CREATE TABLE IF NOT EXISTS articles (
      id VARCHAR(30) PRIMARY KEY,
      title VARCHAR(300) NOT NULL,
      excerpt TEXT,
      content TEXT,
      category VARCHAR(50),
      image TEXT,
      author VARCHAR(100),
      is_breaking BOOLEAN DEFAULT FALSE,
      is_published BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT NOW()
    );

    -- Events
    CREATE TABLE IF NOT EXISTS events (
      id VARCHAR(30) PRIMARY KEY,
      title VARCHAR(200) NOT NULL,
      description TEXT,
      date VARCHAR(50),
      type VARCHAR(50),
      status VARCHAR(20) DEFAULT 'upcoming',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Seed admin
  const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin@social123', 10);
  await pool.query(
    'INSERT INTO admins (name, email, password) VALUES ($1,$2,$3) ON CONFLICT (email) DO NOTHING',
    ['Super Admin', process.env.ADMIN_EMAIL || 'admin@socialnews.org', hash]
  );

  // Seed CMS sections
  const cms = [
    ['hero_banner', 'Hero Banner', 'Where information meets impact.'],
    ['impact_counter', 'Impact Counter', '{"members":"1,248,500","campaigns":"42,310","donations":"$5.4M+"}'],
    ['about_section', 'About Section', 'Social News is a civic engagement platform.'],
  ];
  for (const [key, title, content] of cms) {
    await pool.query(
      'INSERT INTO cms_sections (section_key, title, content) VALUES ($1,$2,$3) ON CONFLICT (section_key) DO NOTHING',
      [key, title, content]
    );
  }

  // Add missing columns (idempotent)
  await pool.query(`
    ALTER TABLE tasks
      ADD COLUMN IF NOT EXISTS instructions TEXT,
      ADD COLUMN IF NOT EXISTS due_date DATE,
      ADD COLUMN IF NOT EXISTS image TEXT;

    ALTER TABLE task_assignments
      ADD COLUMN IF NOT EXISTS submission_note TEXT,
      ADD COLUMN IF NOT EXISTS submission_files JSONB DEFAULT '[]';

    ALTER TABLE quizzes
      ADD COLUMN IF NOT EXISTS time_limit INT DEFAULT 20;

    ALTER TABLE quiz_attempts
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

    ALTER TABLE certificates
      ADD COLUMN IF NOT EXISTS score INT,
      ADD COLUMN IF NOT EXISTS quiz_id VARCHAR(30),
      ADD COLUMN IF NOT EXISTS task_id VARCHAR(30);

    CREATE UNIQUE INDEX IF NOT EXISTS uniq_cert_user_quiz ON certificates (user_id, quiz_id) WHERE quiz_id IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS uniq_cert_user_task ON certificates (user_id, task_id) WHERE task_id IS NOT NULL;
  `);

  console.log('✅ All tables created & seeded');
  process.exit(0);
}

setup().catch(err => { console.error('❌', err.message); process.exit(1); });
