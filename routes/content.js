const router = require('express').Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM cms_sections ORDER BY section_key');
    const content = {};
    result.rows.forEach(row => {
      content[row.section_key] = {
        title: row.title,
        content: row.content,
        metadata: row.metadata || {},
        updated_at: row.updated_at
      };
    });
    res.json(content);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:key', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM cms_sections WHERE section_key=$1', [req.params.key]);
    if (!result.rows.length) return res.status(404).json({ error: 'Content not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;