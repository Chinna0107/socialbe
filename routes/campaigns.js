const router = require('express').Router();
const pool = require('../db');

// Public campaign routes
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, COALESCE(COUNT(r.id), 0)::int as participants
      FROM campaigns c
      LEFT JOIN campaign_registrations r ON c.id = r.campaign_id
      WHERE c.status='active'
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM campaigns WHERE id=$1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Campaign not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;