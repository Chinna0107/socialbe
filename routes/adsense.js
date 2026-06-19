const router = require('express').Router();
const pool = require('../db');

// Public: get active adsense slots for frontend rendering
router.get('/', async (req, res) => {
  try {
    const { placement } = req.query;
    const params = [];
    let query = `SELECT id,slot_name,slot_id,publisher_id,slot_type,page_placement,ad_format,ad_size_width,ad_size_height,custom_css,is_test_mode
                 FROM adsense_slots WHERE is_active=true`;
    if (placement) {
      params.push(placement);
      query += ` AND page_placement=$${params.length}`;
    }
    query += ' ORDER BY created_at ASC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Track impression (no auth required — called by frontend ad component)
router.post('/:id/impression', async (req, res) => {
  try {
    await pool.query('UPDATE adsense_slots SET impressions=impressions+1 WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Track click
router.post('/:id/click', async (req, res) => {
  try {
    await pool.query('UPDATE adsense_slots SET clicks=clicks+1 WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
