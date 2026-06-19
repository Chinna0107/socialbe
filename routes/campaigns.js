const router = require('express').Router();
const pool = require('../db');

// Public campaign routes
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM campaigns WHERE status=\'active\' ORDER BY created_at DESC');
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