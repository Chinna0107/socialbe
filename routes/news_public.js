const router = require('express').Router();
const pool = require('../db');

// GET /api/news — optionally filter by ?category=ap
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    const params = [];
    let categoryFilter = '';
    if (category) {
      params.push(category);
      categoryFilter = ` AND category = $${params.length}`;
    }
    const result = await pool.query(`
      SELECT id, title, category, image, TRIM(TO_CHAR(created_at, 'FMMonth DD, YYYY')) as date, content, excerpt, author
      FROM articles
      WHERE is_published = TRUE${categoryFilter}
      ORDER BY created_at DESC
      LIMIT 100
    `, params);
    res.json({ news: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/news/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, title, category, image, TRIM(TO_CHAR(created_at, 'FMMonth DD, YYYY')) as date, content
      FROM articles
      WHERE id = $1 AND is_published = TRUE
    `, [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'News not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
