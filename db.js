const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  idleTimeoutMillis: 20000,
  connectionTimeoutMillis: 10000,
  max: 10,
});

pool.on('error', (err) => {
  console.error('⚠️ Unexpected DB pool error (connection will be retried):', err.message);
});

pool.connect()
  .then(client => { console.log('✅ Neon DB connected'); client.release(); })
  .catch(err => console.error('❌ DB error:', err.message));

module.exports = pool;
