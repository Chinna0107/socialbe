const router = require('express').Router();
const pool = require('../db');

// GET /api/advertisements
router.get('/', async (req, res) => {
  try {
    const { category, search, limit = 100 } = req.query;
    const params = [];
    const conditions = ['is_active = TRUE'];

    if (category) {
      params.push(category);
      conditions.push(`category = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(title ILIKE $${params.length} OR description ILIKE $${params.length} OR location ILIKE $${params.length})`);
    }

    params.push(Number(limit) || 100);

    const result = await pool.query(
      `SELECT id, title, category, description, location, phone, image, target_url, is_active, created_at
       FROM advertisements
       WHERE ${conditions.join(' AND ')}
       ORDER BY created_at DESC
       LIMIT $${params.length}`,
      params
    );

    res.json({ advertisements: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
