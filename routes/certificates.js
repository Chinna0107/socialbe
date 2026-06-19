const router = require('express').Router();
const pool = require('../db');
const { authUser } = require('../middleware/auth');

router.use(authUser);

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM certificates WHERE user_id=$1 ORDER BY issued_at DESC', [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/download', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM certificates WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Certificate not found' });
    res.json({ downloadUrl: `/certificates/${req.params.id}.pdf`, certificate: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;