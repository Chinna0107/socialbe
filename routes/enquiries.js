const router = require('express').Router();
const pool = require('../db');
const { authAdmin } = require('../middleware/auth');

// Public: submit enquiry
router.post('/', async (req, res) => {
  try {
    const { name, email, subject, message, user_id } = req.body;
    if (!name || !email || !message) return res.status(400).json({ error: 'name, email, message required' });
    const result = await pool.query(
      'INSERT INTO enquiries (user_id, name, email, subject, message) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [user_id || null, name, email, subject, message]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Admin routes
router.use(authAdmin);

router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const params = [];
    const conditions = [];
    if (status) conditions.push(`e.status=$${params.push(status)}`);
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await pool.query(`
      SELECT e.*, u.name as user_name
      FROM enquiries e
      LEFT JOIN users u ON e.user_id = u.id
      ${where}
      ORDER BY e.created_at DESC
      LIMIT $${params.push(limit)} OFFSET $${params.push((page - 1) * limit)}
    `, params);
    const countResult = await pool.query(`SELECT COUNT(*) FROM enquiries e ${where}`, params.slice(0, conditions.length));
    res.json({ enquiries: result.rows, total: parseInt(countResult.rows[0].count) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/stats', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE status='open')::int as open,
        COUNT(*) FILTER (WHERE status='in_progress')::int as in_progress,
        COUNT(*) FILTER (WHERE status='responded')::int as responded,
        COUNT(*) FILTER (WHERE status='resolved')::int as resolved,
        COUNT(*) FILTER (WHERE status='closed')::int as closed
      FROM enquiries
    `);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT e.*, u.name as user_name
      FROM enquiries e LEFT JOIN users u ON e.user_id = u.id
      WHERE e.id=$1
    `, [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Enquiry not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['open', 'in_progress', 'responded', 'resolved', 'closed'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const result = await pool.query(
      'UPDATE enquiries SET status=$1 WHERE id=$2 RETURNING *',
      [status, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Enquiry not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/:id/reply', async (req, res) => {
  try {
    const { reply } = req.body;
    if (!reply) return res.status(400).json({ error: 'reply text required' });
    const result = await pool.query(
      "UPDATE enquiries SET admin_note=$1, status='responded', updated_at=NOW() WHERE id=$2 RETURNING *",
      [reply, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Enquiry not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM enquiries WHERE id=$1', [req.params.id]);
    res.json({ message: 'Enquiry deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
