const router = require('express').Router();
const pool = require('../db');

// Public: get active banners (optionally by position)
router.get('/', async (req, res) => {
  try {
    const { position } = req.query;
    const params = [];
    let query = `SELECT id,title,image,link,target_url,alt_text,position FROM banners WHERE is_active=true`;

    if (position) {
      params.push(position);
      query += ` AND position=$${params.length}`;
    }

    // Filter by date range if start/end dates are set
    query += ` AND (start_date IS NULL OR start_date <= CURRENT_DATE)`;
    query += ` AND (end_date IS NULL OR end_date >= CURRENT_DATE)`;
    query += ` ORDER BY created_at DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM banners WHERE id=$1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Banner not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
