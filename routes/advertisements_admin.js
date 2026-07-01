const router = require('express').Router();
const pool = require('../db');
const { authAdmin } = require('../middleware/auth');

router.use(authAdmin);

// GET /api/admin/advertisements
router.get('/', async (req, res) => {
  try {
    const { category, search, page = 1, limit = 20 } = req.query;
    const safePage = Math.max(Number(page) || 1, 1);
    const safeLimit = Math.max(Number(limit) || 20, 1);
    const offset = (safePage - 1) * safeLimit;
    const params = [];
    const conditions = [];

    if (category) {
      params.push(category);
      conditions.push(`category = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(title ILIKE $${params.length} OR description ILIKE $${params.length} OR location ILIKE $${params.length})`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [data, count] = await Promise.all([
      pool.query(
        `SELECT id, title, category, description, location, phone, image, target_url, is_active, created_at
         FROM advertisements
         ${where}
         ORDER BY created_at DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, safeLimit, offset]
      ),
      pool.query(`SELECT COUNT(*) FROM advertisements ${where}`, params),
    ]);

    res.json({ advertisements: data.rows, total: parseInt(count.rows[0].count, 10) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/advertisements
router.post('/', async (req, res) => {
  try {
    const { title, category, description, location, phone, image, target_url, is_active = true } = req.body;
    const id = `ADV-${Date.now().toString(36).toUpperCase()}`;

    const result = await pool.query(
      `INSERT INTO advertisements (id, title, category, description, location, phone, image, target_url, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [id, title, category, description, location, phone, image, target_url, is_active]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/advertisements/:id
router.put('/:id', async (req, res) => {
  try {
    const { title, category, description, location, phone, image, target_url, is_active = true } = req.body;

    const result = await pool.query(
      `UPDATE advertisements
       SET title=$1, category=$2, description=$3, location=$4, phone=$5, image=$6, target_url=$7, is_active=$8, updated_at=NOW()
       WHERE id=$9
       RETURNING *`,
      [title, category, description, location, phone, image, target_url, is_active, req.params.id]
    );

    if (!result.rows.length) return res.status(404).json({ error: 'Advertisement not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/advertisements/:id/toggle
router.patch('/:id/toggle', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE advertisements SET is_active = NOT is_active, updated_at=NOW() WHERE id=$1 RETURNING *`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Advertisement not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/advertisements/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM advertisements WHERE id=$1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Advertisement not found' });
    res.json({ message: 'Advertisement deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
