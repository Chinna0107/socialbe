const router = require('express').Router();
const pool = require('../db');
const { authAdmin } = require('../middleware/auth');

router.use(authAdmin);

// GET /api/admin/news
router.get('/', async (req, res) => {
  try {
    const { category, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    const conditions = [];

    if (category) {
      params.push(category);
      conditions.push(`category = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`title ILIKE $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    
    const [data, count] = await Promise.all([
      pool.query(
        `SELECT id, title, category, image, TRIM(TO_CHAR(created_at, 'FMMonth DD, YYYY')) as date, content
         FROM articles ${where} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset]
      ),
      pool.query(`SELECT COUNT(*) FROM articles ${where}`, params)
    ]);

    res.json({ news: data.rows, total: parseInt(count.rows[0].count) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/news
router.post('/', async (req, res) => {
  try {
    const { title, category, image, content } = req.body;
    const id = `NEWS-${Date.now().toString(36).toUpperCase()}`;
    const result = await pool.query(
      'INSERT INTO articles (id, title, category, image, content) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [id, title, category, image, content]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/news/:id
router.put('/:id', async (req, res) => {
  try {
    const { title, category, image, content } = req.body;
    const result = await pool.query(
      'UPDATE articles SET title=$1, category=$2, image=$3, content=$4 WHERE id=$5 RETURNING *',
      [title, category, image, content, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'News not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/news/:id
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM articles WHERE id=$1', [req.params.id]);
    res.json({ message: 'News deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
