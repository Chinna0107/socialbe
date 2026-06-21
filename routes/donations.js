const router = require('express').Router();
const pool = require('../db');
const { authAdmin, authAny } = require('../middleware/auth');
const Razorpay = require('razorpay');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_dummykey',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummysecret'
});

// Public: get active donation campaigns
router.get('/campaigns', async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id,title,description,image,goal,collected FROM campaigns WHERE status='active' ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Public: create Razorpay order for donation
router.post('/order', async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'amount required' });
    
    const options = {
      amount: amount * 100, // in paise
      currency: 'INR',
      receipt: `don_${Date.now()}`
    };

    if (razorpay.key_id.includes('dummy') || razorpay.key_id.includes('YourKeyHere')) {
      return res.json({ 
        order: { id: `order_mock_${Date.now()}`, amount: options.amount }, 
        key: razorpay.key_id,
        mock: true 
      });
    }

    const order = await razorpay.orders.create(options);
    res.json({ order, key: razorpay.key_id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Public: submit donation
router.post('/donate', async (req, res) => {
  try {
    const { campaign_id, amount, donor_name, donor_email, message, user_id, payment_id } = req.body;
    if (!campaign_id || !amount || amount <= 0) return res.status(400).json({ error: 'campaign_id and positive amount required' });
    const donationId = `DON-${Date.now().toString(36).toUpperCase()}`;
    const donationMessage = payment_id ? `[Payment: ${payment_id}] ${message || ''}` : message;
    
    const result = await pool.query(
      'INSERT INTO donations (id, user_id, campaign_id, amount, donor_name, donor_email, message) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [donationId, user_id || null, campaign_id, amount, donor_name, donor_email, donationMessage]
    );
    await pool.query('UPDATE campaigns SET collected = collected + $1 WHERE id=$2', [amount, campaign_id]);
    await pool.query(
      "INSERT INTO activity_logs (user_id, action, details) VALUES ($1, 'donation', $2)",
      [user_id || null, `Donated ₹${amount} to campaign ${campaign_id}`]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Admin routes
router.use(authAdmin);

router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, campaign_id, from, to } = req.query;
    const params = [];
    const conditions = [];
    if (status) { conditions.push(`d.status=$${params.push(status)}`); }
    if (campaign_id) { conditions.push(`d.campaign_id=$${params.push(campaign_id)}`); }
    if (from) { conditions.push(`d.created_at >= $${params.push(from)}`); }
    if (to) { conditions.push(`d.created_at <= $${params.push(to)}`); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await pool.query(`
      SELECT d.*, c.title as campaign_title, u.name as user_name, u.email as user_email
      FROM donations d
      LEFT JOIN campaigns c ON d.campaign_id = c.id
      LEFT JOIN users u ON d.user_id = u.id
      ${where}
      ORDER BY d.created_at DESC
      LIMIT $${params.push(limit)} OFFSET $${params.push((page - 1) * limit)}
    `, params);
    const countResult = await pool.query(`SELECT COUNT(*) FROM donations d ${where}`, params.slice(0, conditions.length));
    res.json({ donations: result.rows, total: parseInt(countResult.rows[0].count) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/stats', async (req, res) => {
  try {
    const [totals, monthly, byCampaign] = await Promise.all([
      pool.query(`
        SELECT 
          COUNT(*) as total_donations,
          SUM(amount) as total_amount,
          AVG(amount) as avg_amount,
          COUNT(DISTINCT donor_email) as unique_donors
        FROM donations WHERE status='completed'
      `),
      pool.query(`
        SELECT DATE_TRUNC('month', created_at) as month, SUM(amount) as total, COUNT(*) as count
        FROM donations WHERE status='completed'
        GROUP BY month ORDER BY month DESC LIMIT 12
      `),
      pool.query(`
        SELECT c.title, SUM(d.amount) as total
        FROM donations d JOIN campaigns c ON d.campaign_id = c.id
        WHERE d.status='completed'
        GROUP BY c.title ORDER BY total DESC LIMIT 5
      `)
    ]);
    res.json({ totals: totals.rows[0], monthly: monthly.rows, byCampaign: byCampaign.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['completed', 'pending', 'refunded', 'failed'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const prev = await pool.query('SELECT * FROM donations WHERE id=$1', [req.params.id]);
    if (!prev.rows.length) return res.status(404).json({ error: 'Donation not found' });
    const donation = prev.rows[0];
    const result = await pool.query('UPDATE donations SET status=$1 WHERE id=$2 RETURNING *', [status, req.params.id]);
    // Reverse campaign amount on refund
    if (status === 'refunded' && donation.status === 'completed') {
      await pool.query('UPDATE campaigns SET collected = GREATEST(collected - $1, 0) WHERE id=$2', [donation.amount, donation.campaign_id]);
    }
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM donations WHERE id=$1', [req.params.id]);
    res.json({ message: 'Donation deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
