const router = require('express').Router();
const pool = require('../db');
const { authUser } = require('../middleware/auth');

// Get public tasks
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tasks WHERE status=\'active\' ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get task by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tasks WHERE id=$1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Task not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;