const pool = require('./db');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function createUsers() {
  try {
    // Create Admin
    const adminPassword = await bcrypt.hash('Admin@123', 10);
    await pool.query(
      'INSERT INTO admins (name, email, password) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING',
      ['Admin User', 'admin@socialnews.com', adminPassword]
    );

    // Create Regular User
    const userPassword = await bcrypt.hash('User@123', 10);
    await pool.query(
      `INSERT INTO users (name, email, password, role, student_id, phone, impact_points) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (email) DO NOTHING`,
      ['John Doe', 'user@socialnews.com', userPassword, 'user', 'USR001', '+1234567890', 50]
    );

    // Create Student
    const studentPassword = await bcrypt.hash('Student@123', 10);
    await pool.query(
      `INSERT INTO users (name, email, password, role, student_id, phone, impact_points, level) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (email) DO NOTHING`,
      ['Jane Smith', 'student@socialnews.com', studentPassword, 'student', 'STU001', '+1987654321', 150, 'Level 2']
    );

    console.log('✅ Users created successfully!');
    console.log('\n📋 LOGIN CREDENTIALS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔐 ADMIN:');
    console.log('   Email: admin@socialnews.com');
    console.log('   Password: Admin@123');
    console.log('   Login URL: POST /api/auth/admin-login');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👤 USER:');
    console.log('   Email: user@socialnews.com');
    console.log('   Password: User@123');
    console.log('   Login URL: POST /api/auth/login');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎓 STUDENT:');
    console.log('   Email: student@socialnews.com');
    console.log('   Password: Student@123');
    console.log('   Login URL: POST /api/auth/login');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating users:', error.message);
    process.exit(1);
  }
}

createUsers();