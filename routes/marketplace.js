const router = require('express').Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const { category, limit = 20 } = req.query;
    let query = 'SELECT * FROM products WHERE status=\'active\'';
    const params = [];
    
    if (category) {
      query += ' AND category=$1';
      params.push(category);
    }
    
    query += ` ORDER BY created_at DESC LIMIT ${limit}`;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products WHERE id=$1 AND status=\'active\'', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Product not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;