const router = require('express').Router();
const pool = require('../db');
const { authAdmin } = require('../middleware/auth');

router.use(authAdmin);

router.get('/overview', async (req, res) => {
  try {
    const [users, campaigns, tasks, donations, submissions, enquiries] = await Promise.all([
      pool.query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_active=true) as active FROM users'),
      pool.query("SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status='active') as active FROM campaigns"),
      pool.query("SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status='active') as active FROM tasks"),
      pool.query("SELECT COUNT(*) as total, COALESCE(SUM(amount),0) as total_amount FROM donations WHERE status='completed'"),
      pool.query("SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status='APPROVED') as approved FROM task_assignments"),
      pool.query("SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status='open') as open FROM enquiries"),
    ]);
    res.json({
      users: users.rows[0],
      campaigns: campaigns.rows[0],
      tasks: tasks.rows[0],
      donations: donations.rows[0],
      submissions: submissions.rows[0],
      enquiries: enquiries.rows[0],
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/users', async (req, res) => {
  try {
    const [roleStats, registrationTrends, topUsers] = await Promise.all([
      pool.query('SELECT role, COUNT(*) as count FROM users GROUP BY role ORDER BY count DESC'),
      pool.query(`
        SELECT DATE_TRUNC('month', created_at) as month, COUNT(*) as registrations
        FROM users WHERE created_at >= NOW() - INTERVAL '12 months'
        GROUP BY month ORDER BY month ASC
      `),
      pool.query('SELECT id, name, email, role, impact_points, level FROM users ORDER BY impact_points DESC LIMIT 10'),
    ]);
    res.json({ roleStats: roleStats.rows, registrationTrends: registrationTrends.rows, topUsers: topUsers.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/donations', async (req, res) => {
  try {
    const [monthly, byCampaign, recentDonors] = await Promise.all([
      pool.query(`
        SELECT DATE_TRUNC('month', created_at) as month, SUM(amount) as total, COUNT(*) as count
        FROM donations WHERE status='completed'
        GROUP BY month ORDER BY month ASC LIMIT 12
      `),
      pool.query(`
        SELECT c.title, c.goal, c.collected,
          CASE WHEN c.goal > 0 THEN ROUND((c.collected / c.goal) * 100, 1) ELSE 0 END as progress_pct
        FROM campaigns c ORDER BY c.collected DESC LIMIT 10
      `),
      pool.query(`
        SELECT donor_name, donor_email, SUM(amount) as total, COUNT(*) as donation_count
        FROM donations WHERE status='completed'
        GROUP BY donor_name, donor_email ORDER BY total DESC LIMIT 10
      `),
    ]);
    res.json({ monthly: monthly.rows, byCampaign: byCampaign.rows, recentDonors: recentDonors.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/tasks', async (req, res) => {
  try {
    const [statusBreakdown, submissionTrends, topTasks] = await Promise.all([
      pool.query('SELECT status, COUNT(*) as count FROM task_assignments GROUP BY status'),
      pool.query(`
        SELECT DATE_TRUNC('day', submitted_at) as day, COUNT(*) as count
        FROM task_assignments WHERE submitted_at >= NOW() - INTERVAL '30 days'
        GROUP BY day ORDER BY day ASC
      `),
      pool.query(`
        SELECT t.title, COUNT(ta.id) as submissions, COUNT(ta.id) FILTER (WHERE ta.status='APPROVED') as approved
        FROM tasks t LEFT JOIN task_assignments ta ON t.id = ta.task_id
        GROUP BY t.id, t.title ORDER BY submissions DESC LIMIT 10
      `),
    ]);
    res.json({ statusBreakdown: statusBreakdown.rows, submissionTrends: submissionTrends.rows, topTasks: topTasks.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/activity', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const [logs, summary] = await Promise.all([
      pool.query(`
        SELECT al.*, u.name as user_name, u.email as user_email
        FROM activity_logs al LEFT JOIN users u ON al.user_id = u.id
        WHERE al.created_at >= NOW() - INTERVAL '${parseInt(days)} days'
        ORDER BY al.created_at DESC LIMIT 100
      `),
      pool.query(`
        SELECT action, COUNT(*) as count
        FROM activity_logs WHERE created_at >= NOW() - INTERVAL '${parseInt(days)} days'
        GROUP BY action ORDER BY count DESC
      `),
    ]);
    res.json({ logs: logs.rows, summary: summary.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/adsense', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT label, slot, position, impressions, clicks,
        CASE WHEN impressions > 0 THEN ROUND((clicks::numeric / impressions) * 100, 2) ELSE 0 END as ctr,
        is_active, created_at
      FROM adsense_units ORDER BY impressions DESC
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
