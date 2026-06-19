const router = require('express').Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT id,title,description,total_questions,status FROM quizzes WHERE status=\'active\' ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM quizzes WHERE id=$1 AND status=\'active\'', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Quiz not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;