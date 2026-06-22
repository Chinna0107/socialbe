const router = require('express').Router();
const pool = require('../db');
const { authAdmin } = require('../middleware/auth');

// Apply admin auth to ALL routes in this file
router.use(authAdmin);

// ─────────────────────────────────────────────
// DASHBOARD ANALYTICS
// ─────────────────────────────────────────────
router.get('/dashboard', async (req, res) => {
  try {
    const [users, campaigns, tasks, donations, enquiries, banners, adsense] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM users WHERE is_active=true'),
      pool.query("SELECT COUNT(*) FROM campaigns WHERE status='active'"),
      pool.query("SELECT COUNT(*) FROM tasks WHERE status='active'"),
      pool.query("SELECT SUM(amount) FROM donations WHERE status='completed'"),
      pool.query("SELECT COUNT(*) FROM enquiries WHERE status='open'"),
      pool.query('SELECT COUNT(*) FROM banners WHERE is_active=true'),
      pool.query('SELECT COUNT(*) FROM adsense_slots WHERE is_active=true'),
    ]);

    const [recentUsers, recentDonations, recentEnquiries] = await Promise.all([
      pool.query('SELECT id,name,email,role,created_at FROM users ORDER BY created_at DESC LIMIT 5'),
      pool.query(`SELECT d.*, c.title as campaign_title FROM donations d
                  LEFT JOIN campaigns c ON d.campaign_id=c.id
                  ORDER BY d.created_at DESC LIMIT 5`),
      pool.query('SELECT * FROM enquiries ORDER BY created_at DESC LIMIT 5'),
    ]);

    res.json({
      stats: {
        totalUsers:       parseInt(users.rows[0].count),
        activeCampaigns:  parseInt(campaigns.rows[0].count),
        activeTasks:      parseInt(tasks.rows[0].count),
        totalDonations:   parseFloat(donations.rows[0].sum || 0),
        openEnquiries:    parseInt(enquiries.rows[0].count),
        activeBanners:    parseInt(banners.rows[0].count),
        activeAdSlots:    parseInt(adsense.rows[0].count),
      },
      recentUsers:     recentUsers.rows,
      recentDonations: recentDonations.rows,
      recentEnquiries: recentEnquiries.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// USER MANAGEMENT
// ─────────────────────────────────────────────
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, role, status, search } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    const conditions = [];

    if (role) {
      params.push(role);
      conditions.push(`role = $${params.length}`);
    }
    if (status !== undefined && status !== '') {
      params.push(status === 'active');
      conditions.push(`is_active = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(name ILIKE $${params.length} OR email ILIKE $${params.length})`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [dataResult, countResult] = await Promise.all([
      pool.query(
        `SELECT id,name,email,role,phone,impact_points,level,student_id,is_active,created_at,age,gender,college,address
         FROM users ${where}
         ORDER BY created_at DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset]
      ),
      pool.query(`SELECT COUNT(*) FROM users ${where}`, params),
    ]);

    res.json({
      users: dataResult.rows,
      total: parseInt(countResult.rows[0].count),
      page:  parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/users/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id,name,email,role,phone,impact_points,level,student_id,is_active,created_at,age,gender,college,address FROM users WHERE id=$1',
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/users/:id', async (req, res) => {
  try {
    const { name, email, role, phone, is_active } = req.body;
    const result = await pool.query(
      'UPDATE users SET name=$1, email=$2, role=$3, phone=$4, is_active=$5, updated_at=NOW() WHERE id=$6 RETURNING *',
      [name, email, role, phone, is_active, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle active status
router.patch('/users/:id/toggle', async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE users SET is_active = NOT is_active WHERE id=$1 RETURNING id,name,email,is_active',
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id=$1', [req.params.id]);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// CAMPAIGN MANAGEMENT
// ─────────────────────────────────────────────
router.get('/campaigns', async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const params = [];
    const conditions = [];

    if (status) { params.push(status); conditions.push(`status=$${params.length}`); }
    if (search) { params.push(`%${search}%`); conditions.push(`title ILIKE $${params.length}`); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [data, count] = await Promise.all([
      pool.query(`SELECT * FROM campaigns ${where} ORDER BY created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`, [...params, limit, (page-1)*limit]),
      pool.query(`SELECT COUNT(*) FROM campaigns ${where}`, params),
    ]);
    res.json({ campaigns: data.rows, total: parseInt(count.rows[0].count) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/campaigns/:id/participants', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT cr.registered_at as joined_at, u.id, u.name, u.email, u.student_id, u.phone 
       FROM campaign_registrations cr
       JOIN users u ON cr.user_id = u.id
       WHERE cr.campaign_id = $1
       ORDER BY cr.registered_at DESC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/campaigns', async (req, res) => {
  try {
    const { title, description, image, goal, entry_fee, tag } = req.body;
    const id = `CAMP-${Date.now().toString(36).toUpperCase()}`;
    const result = await pool.query(
      'INSERT INTO campaigns (id,title,description,image,goal,entry_fee,tag) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [id, title, description, image, goal, entry_fee || 0, tag]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/campaigns/:id', async (req, res) => {
  try {
    const { title, description, image, goal, entry_fee, tag, status } = req.body;
    const result = await pool.query(
      'UPDATE campaigns SET title=$1,description=$2,image=$3,goal=$4,entry_fee=$5,tag=$6,status=$7 WHERE id=$8 RETURNING *',
      [title, description, image, goal, entry_fee || 0, tag, status, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/campaigns/:id', async (req, res) => {
  try {
    await pool.query("UPDATE campaigns SET status='archived' WHERE id=$1", [req.params.id]);
    res.json({ message: 'Campaign archived' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// TASK MANAGEMENT
// ─────────────────────────────────────────────
router.get('/tasks', async (req, res) => {
  try {
    const { campaign_id, status, page = 1, limit = 20 } = req.query;
    const params = [];
    const conditions = [];

    if (campaign_id) { params.push(campaign_id); conditions.push(`t.campaign_id=$${params.length}`); }
    if (status)      { params.push(status);      conditions.push(`t.status=$${params.length}`); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [data, count] = await Promise.all([
      pool.query(
        `SELECT t.*,c.title as campaign_title FROM tasks t LEFT JOIN campaigns c ON t.campaign_id=c.id ${where} ORDER BY t.created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`,
        [...params, limit, (page-1)*limit]
      ),
      pool.query(`SELECT COUNT(*) FROM tasks t ${where}`, params),
    ]);
    res.json({ tasks: data.rows, total: parseInt(count.rows[0].count) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/tasks', async (req, res) => {
  try {
    const { title, description, instructions, priority, points, campaign_id, dueDate, due_date, imageUrl, image } = req.body;
    const id = `TASK-${Date.now().toString(36).toUpperCase()}`;
    const result = await pool.query(
      'INSERT INTO tasks (id,title,description,instructions,priority,points,campaign_id,due_date,image) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
      [id, title, description, instructions || null, priority, points, campaign_id || null, dueDate || due_date || null, imageUrl || image || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/tasks/:id', async (req, res) => {
  try {
    const { title, description, instructions, priority, points, status, campaign_id, dueDate, due_date, imageUrl, image } = req.body;
    const result = await pool.query(
      'UPDATE tasks SET title=$1,description=$2,instructions=$3,priority=$4,points=$5,status=$6,campaign_id=$7,due_date=$8,image=$9 WHERE id=$10 RETURNING *',
      [title, description, instructions || null, priority, points, status, campaign_id || null, dueDate || due_date || null, imageUrl || image || null, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/tasks/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM tasks WHERE id=$1', [req.params.id]);
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// TASK SUBMISSION MANAGEMENT
// ─────────────────────────────────────────────
router.get('/submissions', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const params = [];
    const conditions = [];

    if (status) { params.push(status); conditions.push(`ta.status=$${params.length}`); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [data, count] = await Promise.all([
      pool.query(
        `SELECT ta.*,
                t.title as task_title, t.points as task_points,
                u.name as user_name, u.email as user_email, u.student_id
         FROM task_assignments ta
         JOIN tasks t ON ta.task_id=t.id
         JOIN users u ON ta.user_id=u.id
         ${where}
         ORDER BY ta.submitted_at DESC NULLS LAST, ta.created_at DESC
         LIMIT $${params.length+1} OFFSET $${params.length+2}`,
        [...params, limit, (page-1)*limit]
      ),
      pool.query(`SELECT COUNT(*) FROM task_assignments ta ${where}`, params),
    ]);
    res.json({ submissions: data.rows, total: parseInt(count.rows[0].count) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/submissions/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ta.*,
              t.title as task_title, t.points as task_points, t.description as task_description,
              u.name as user_name, u.email as user_email, u.student_id
       FROM task_assignments ta
       JOIN tasks t ON ta.task_id=t.id
       JOIN users u ON ta.user_id=u.id
       WHERE ta.id=$1`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Submission not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/submissions/:id/approve', async (req, res) => {
  try {
    const sub = await pool.query('SELECT * FROM task_assignments WHERE id=$1', [req.params.id]);
    if (!sub.rows.length) return res.status(404).json({ error: 'Submission not found' });
    const { task_id, user_id } = sub.rows[0];

    const task = await pool.query('SELECT points, title FROM tasks WHERE id=$1', [task_id]);
    const pts  = task.rows[0]?.points || 0;
    const taskTitle = task.rows[0]?.title || 'Task';

    const result = await pool.query(
      "UPDATE task_assignments SET status='APPROVED',approved_at=NOW(),points_earned=$1 WHERE id=$2 RETURNING *",
      [pts, req.params.id]
    );
    await pool.query('UPDATE users SET impact_points=impact_points+$1 WHERE id=$2', [pts, user_id]);

    // Auto-generate certificate for approved task (same pattern as quiz certificates)
    const certId = `CERT-${user_id}-${task_id}`.slice(0, 30);
    await pool.query(
      `INSERT INTO certificates (id, user_id, title, type, task_id, issued_at, is_verified)
       VALUES ($1, $2, $3, 'task', $4, NOW(), true)
       ON CONFLICT (user_id, task_id) WHERE task_id IS NOT NULL
       DO UPDATE SET issued_at=NOW()`,
      [certId, user_id, taskTitle + ' - Task Completion Certificate', task_id]
    );

    await pool.query('INSERT INTO activity_logs (user_id, action, details) VALUES ($1, $2, $3)',
      [user_id, 'certificate_earned', `Earned certificate for completing task: ${taskTitle}`]);

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/submissions/:id/reject', async (req, res) => {
  try {
    const { reason } = req.body;
    const result = await pool.query(
      "UPDATE task_assignments SET status='REJECTED',rejection_reason=$1 WHERE id=$2 RETURNING *",
      [reason || null, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// QUIZ SUBMISSION MANAGEMENT
// ─────────────────────────────────────────────
router.get('/quiz-submissions', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const [data, count] = await Promise.all([
      pool.query(
        `SELECT qa.*,
                q.title as quiz_title, q.total_questions,
                u.name as user_name, u.email as user_email, u.student_id
         FROM quiz_attempts qa
         JOIN quizzes q ON qa.quiz_id=q.id
         JOIN users u ON qa.user_id=u.id
         ORDER BY qa.completed_at DESC NULLS LAST, qa.created_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, (page-1)*limit]
      ),
      pool.query('SELECT COUNT(*) FROM quiz_attempts'),
    ]);
    res.json({ results: data.rows, total: parseInt(count.rows[0].count) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// QUIZ MANAGEMENT
// ─────────────────────────────────────────────
router.get('/quizzes', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const params = [];
    const conditions = [];
    if (status) { params.push(status); conditions.push(`status=$${params.length}`); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [data, count] = await Promise.all([
      pool.query(`SELECT * FROM quizzes ${where} ORDER BY created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`, [...params, limit, (page-1)*limit]),
      pool.query(`SELECT COUNT(*) FROM quizzes ${where}`, params),
    ]);
    res.json({ quizzes: data.rows, total: parseInt(count.rows[0].count) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/quizzes', async (req, res) => {
  try {
    const { title, description, questions, timeLimit, time_limit } = req.body;
    const id = `QUIZ-${Date.now().toString(36).toUpperCase()}`;
    const result = await pool.query(
      'INSERT INTO quizzes (id,title,description,questions,total_questions,time_limit) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [id, title, description, JSON.stringify(questions || []), (questions || []).length, timeLimit || time_limit || 20]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/quizzes/:id', async (req, res) => {
  try {
    const { title, description, questions, status, timeLimit, time_limit } = req.body;
    const result = await pool.query(
      'UPDATE quizzes SET title=$1,description=$2,questions=$3,total_questions=$4,status=$5,time_limit=$6 WHERE id=$7 RETURNING *',
      [title, description, JSON.stringify(questions || []), (questions || []).length, status, timeLimit || time_limit || 20, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/quizzes/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM quizzes WHERE id=$1', [req.params.id]);
    res.json({ message: 'Quiz deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// MARKETPLACE MANAGEMENT
// ─────────────────────────────────────────────
router.get('/marketplace', async (req, res) => {
  try {
    const { category, status, page = 1, limit = 20 } = req.query;
    const params = [];
    const conditions = [];
    if (category) { params.push(category); conditions.push(`category=$${params.length}`); }
    if (status)   { params.push(status);   conditions.push(`status=$${params.length}`); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [data, count] = await Promise.all([
      pool.query(`SELECT * FROM products ${where} ORDER BY created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`, [...params, limit, (page-1)*limit]),
      pool.query(`SELECT COUNT(*) FROM products ${where}`, params),
    ]);
    res.json({ products: data.rows, total: parseInt(count.rows[0].count) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/marketplace', async (req, res) => {
  try {
    const { name, description, price, image, image_url, stock, category } = req.body;
    const finalImage = image || image_url;
    const id = `PROD-${Date.now().toString(36).toUpperCase()}`;
    const result = await pool.query(
      'INSERT INTO products (id,name,description,price,image,stock,category) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [id, name, description, price, finalImage, stock, category]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/marketplace/:id', async (req, res) => {
  try {
    const { name, description, price, image, image_url, stock, category, status } = req.body;
    const finalImage = image || image_url;
    const result = await pool.query(
      'UPDATE products SET name=$1,description=$2,price=$3,image=$4,stock=$5,category=$6,status=$7 WHERE id=$8 RETURNING *',
      [name, description, price, finalImage, stock, category, status, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/marketplace/:id', async (req, res) => {
  try {
    await pool.query("UPDATE products SET status='inactive' WHERE id=$1", [req.params.id]);
    res.json({ message: 'Product deactivated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Order Management
router.get('/orders', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const params = [];
    const conditions = [];
    if (status) { params.push(status); conditions.push(`o.status=$${params.length}`); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [data, count] = await Promise.all([
      pool.query(`
        SELECT o.*, u.name as user_name, u.email as user_email 
        FROM orders o 
        LEFT JOIN users u ON o.user_id = u.id 
        ${where} ORDER BY o.created_at DESC 
        LIMIT $${params.length+1} OFFSET $${params.length+2}
      `, [...params, limit, (page-1)*limit]),
      pool.query(`SELECT COUNT(*) FROM orders o ${where}`, params),
    ]);
    res.json({ orders: data.rows, total: parseInt(count.rows[0].count) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/orders/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const result = await pool.query(
      'UPDATE orders SET status=$1 WHERE id=$2 RETURNING *',
      [status, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// CERTIFICATE MANAGEMENT
// ─────────────────────────────────────────────
router.get('/certificates', async (req, res) => {
  try {
    const { type, page = 1, limit = 20 } = req.query;
    const params = [];
    const conditions = [];
    if (type) { params.push(type); conditions.push(`c.type=$${params.length}`); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [data, count] = await Promise.all([
      pool.query(
        `SELECT c.*,u.name as user_name,u.email as user_email FROM certificates c JOIN users u ON c.user_id=u.id ${where} ORDER BY c.issued_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`,
        [...params, limit, (page-1)*limit]
      ),
      pool.query(`SELECT COUNT(*) FROM certificates c ${where}`, params),
    ]);
    res.json({ certificates: data.rows, total: parseInt(count.rows[0].count) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/certificates', async (req, res) => {
  try {
    const { user_id, title, type, reference_id } = req.body;
    const id = `CERT-${Date.now().toString(36).toUpperCase()}`;
    const result = await pool.query(
      'INSERT INTO certificates (id,user_id,title,type,reference_id) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [id, user_id, title, type, reference_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/certificates/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM certificates WHERE id=$1', [req.params.id]);
    res.json({ message: 'Certificate deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// ADVERTISEMENT BANNER MANAGEMENT
// ─────────────────────────────────────────────
router.get('/banners', async (req, res) => {
  try {
    const { position, is_active, page = 1, limit = 20 } = req.query;
    const params = [];
    const conditions = [];
    if (position)  { params.push(position);         conditions.push(`position=$${params.length}`); }
    if (is_active !== undefined && is_active !== '') { params.push(is_active === 'true'); conditions.push(`is_active=$${params.length}`); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [data, count] = await Promise.all([
      pool.query(`SELECT * FROM banners ${where} ORDER BY created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`, [...params, limit, (page-1)*limit]),
      pool.query(`SELECT COUNT(*) FROM banners ${where}`, params),
    ]);
    res.json({ banners: data.rows, total: parseInt(count.rows[0].count) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/banners', async (req, res) => {
  try {
    const { title, image, link, position, start_date, end_date, target_url, alt_text } = req.body;
    const result = await pool.query(
      `INSERT INTO banners (title,image,link,position,start_date,end_date,target_url,alt_text)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [title, image, link, position || 'header', start_date || null, end_date || null, target_url || link, alt_text || title]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/banners/:id', async (req, res) => {
  try {
    const { title, image, link, position, is_active, start_date, end_date, target_url, alt_text } = req.body;
    const result = await pool.query(
      `UPDATE banners SET title=$1,image=$2,link=$3,position=$4,is_active=$5,
       start_date=$6,end_date=$7,target_url=$8,alt_text=$9,updated_at=NOW()
       WHERE id=$10 RETURNING *`,
      [title, image, link, position, is_active, start_date || null, end_date || null, target_url || link, alt_text || title, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Banner not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/banners/:id/toggle', async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE banners SET is_active=NOT is_active,updated_at=NOW() WHERE id=$1 RETURNING *',
      [req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/banners/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM banners WHERE id=$1', [req.params.id]);
    res.json({ message: 'Banner deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// DONATION MANAGEMENT
// ─────────────────────────────────────────────
router.get('/donations', async (req, res) => {
  try {
    const { status, campaign_id, search, page = 1, limit = 20 } = req.query;
    const params = [];
    const conditions = [];
    if (status)      { params.push(status);      conditions.push(`d.status=$${params.length}`); }
    if (campaign_id) { params.push(campaign_id); conditions.push(`d.campaign_id=$${params.length}`); }
    if (search)      { params.push(`%${search}%`); conditions.push(`(d.donor_name ILIKE $${params.length} OR d.donor_email ILIKE $${params.length})`); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [data, count, totals] = await Promise.all([
      pool.query(
        `SELECT d.*,c.title as campaign_title,u.name as user_name
         FROM donations d
         LEFT JOIN campaigns c ON d.campaign_id=c.id
         LEFT JOIN users u ON d.user_id=u.id
         ${where}
         ORDER BY d.created_at DESC
         LIMIT $${params.length+1} OFFSET $${params.length+2}`,
        [...params, limit, (page-1)*limit]
      ),
      pool.query(`SELECT COUNT(*) FROM donations d ${where}`, params),
      pool.query(`SELECT SUM(amount) as total_amount, COUNT(*) as total_count FROM donations d WHERE status='completed'`),
    ]);

    res.json({
      donations:    data.rows,
      total:        parseInt(count.rows[0].count),
      totalAmount:  parseFloat(totals.rows[0].total_amount || 0),
      totalCount:   parseInt(totals.rows[0].total_count),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/donations/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT d.*,c.title as campaign_title,u.name as user_name
       FROM donations d
       LEFT JOIN campaigns c ON d.campaign_id=c.id
       LEFT JOIN users u ON d.user_id=u.id
       WHERE d.id=$1`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Donation not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/donations/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['pending', 'completed', 'failed', 'refunded'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const result = await pool.query(
      'UPDATE donations SET status=$1 WHERE id=$2 RETURNING *',
      [status, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/donations/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM donations WHERE id=$1', [req.params.id]);
    res.json({ message: 'Donation record deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Donation summary by campaign
router.get('/donations/summary/campaigns', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.id, c.title, c.goal, c.collected,
             COUNT(d.id) as donation_count,
             SUM(d.amount) as total_raised
      FROM campaigns c
      LEFT JOIN donations d ON d.campaign_id=c.id AND d.status='completed'
      GROUP BY c.id, c.title, c.goal, c.collected
      ORDER BY total_raised DESC NULLS LAST
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// ENQUIRY MANAGEMENT
// ─────────────────────────────────────────────
router.get('/enquiries', async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const params = [];
    const conditions = [];
    if (status) { params.push(status); conditions.push(`e.status=$${params.length}`); }
    if (search) { params.push(`%${search}%`); conditions.push(`(e.name ILIKE $${params.length} OR e.email ILIKE $${params.length} OR e.subject ILIKE $${params.length})`); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [data, count] = await Promise.all([
      pool.query(
        `SELECT e.*,u.name as user_name
         FROM enquiries e
         LEFT JOIN users u ON e.user_id=u.id
         ${where}
         ORDER BY e.created_at DESC
         LIMIT $${params.length+1} OFFSET $${params.length+2}`,
        [...params, limit, (page-1)*limit]
      ),
      pool.query(`SELECT COUNT(*) FROM enquiries e ${where}`, params),
    ]);
    res.json({ enquiries: data.rows, total: parseInt(count.rows[0].count) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/enquiries/stats', async (req, res) => {
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/enquiries/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['open', 'in_progress', 'responded', 'resolved', 'closed'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const result = await pool.query(
      'UPDATE enquiries SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING *',
      [status, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Enquiry not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/enquiries/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT e.*,u.name as user_name FROM enquiries e LEFT JOIN users u ON e.user_id=u.id WHERE e.id=$1`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Enquiry not found' });
    // Also get replies
    const replies = await pool.query(
      'SELECT * FROM enquiry_replies WHERE enquiry_id=$1 ORDER BY created_at ASC',
      [req.params.id]
    );
    res.json({ ...result.rows[0], replies: replies.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/enquiries/:id', async (req, res) => {
  try {
    const { status, admin_note } = req.body;
    const result = await pool.query(
      'UPDATE enquiries SET status=$1,admin_note=$2,updated_at=NOW() WHERE id=$3 RETURNING *',
      [status, admin_note || null, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reply to enquiry
router.post('/enquiries/:id/reply', async (req, res) => {
  try {
    const { reply_message } = req.body;
    const admin_id = req.admin.id;

    const reply = await pool.query(
      'INSERT INTO enquiry_replies (enquiry_id,admin_id,message) VALUES ($1,$2,$3) RETURNING *',
      [req.params.id, admin_id, reply_message]
    );
    // Mark enquiry as responded
    await pool.query(
      "UPDATE enquiries SET status='responded',updated_at=NOW() WHERE id=$1",
      [req.params.id]
    );
    res.status(201).json(reply.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/enquiries/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM enquiries WHERE id=$1', [req.params.id]);
    res.json({ message: 'Enquiry deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// GOOGLE ADSENSE SUPPORTIVE STRUCTURE
// ─────────────────────────────────────────────
router.get('/adsense', async (req, res) => {
  try {
    const { is_active, slot_type, page = 1, limit = 20 } = req.query;
    const params = [];
    const conditions = [];
    if (is_active !== undefined && is_active !== '') { params.push(is_active === 'true'); conditions.push(`is_active=$${params.length}`); }
    if (slot_type) { params.push(slot_type); conditions.push(`slot_type=$${params.length}`); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [data, count, impressions] = await Promise.all([
      pool.query(`SELECT * FROM adsense_slots ${where} ORDER BY created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`, [...params, limit, (page-1)*limit]),
      pool.query(`SELECT COUNT(*) FROM adsense_slots ${where}`, params),
      pool.query('SELECT SUM(impressions) as total_impressions, SUM(clicks) as total_clicks FROM adsense_slots'),
    ]);

    res.json({
      slots:            data.rows,
      total:            parseInt(count.rows[0].count),
      totalImpressions: parseInt(impressions.rows[0].total_impressions || 0),
      totalClicks:      parseInt(impressions.rows[0].total_clicks || 0),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/adsense/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM adsense_slots WHERE id=$1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'AdSense slot not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/adsense', async (req, res) => {
  try {
    const { slot_name, slot_id, publisher_id, slot_type, page_placement, ad_format, ad_size_width, ad_size_height, custom_css, is_test_mode } = req.body;
    const result = await pool.query(
      `INSERT INTO adsense_slots
       (slot_name,slot_id,publisher_id,slot_type,page_placement,ad_format,ad_size_width,ad_size_height,custom_css,is_test_mode)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [slot_name, slot_id, publisher_id, slot_type || 'display', page_placement, ad_format || 'auto', ad_size_width || null, ad_size_height || null, custom_css || null, is_test_mode || false]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/adsense/:id', async (req, res) => {
  try {
    const { slot_name, slot_id, publisher_id, slot_type, page_placement, ad_format, ad_size_width, ad_size_height, custom_css, is_active, is_test_mode } = req.body;
    const result = await pool.query(
      `UPDATE adsense_slots SET
       slot_name=$1,slot_id=$2,publisher_id=$3,slot_type=$4,page_placement=$5,
       ad_format=$6,ad_size_width=$7,ad_size_height=$8,custom_css=$9,
       is_active=$10,is_test_mode=$11,updated_at=NOW()
       WHERE id=$12 RETURNING *`,
      [slot_name, slot_id, publisher_id, slot_type, page_placement, ad_format, ad_size_width, ad_size_height, custom_css, is_active, is_test_mode, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/adsense/:id/toggle', async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE adsense_slots SET is_active=NOT is_active,updated_at=NOW() WHERE id=$1 RETURNING *',
      [req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Record impression / click (called from frontend ad component)
router.post('/adsense/:id/impression', async (req, res) => {
  try {
    await pool.query('UPDATE adsense_slots SET impressions=impressions+1 WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/adsense/:id/click', async (req, res) => {
  try {
    await pool.query('UPDATE adsense_slots SET clicks=clicks+1 WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/adsense/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM adsense_slots WHERE id=$1', [req.params.id]);
    res.json({ message: 'AdSense slot deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// CONTENT (CMS) MANAGEMENT
// ─────────────────────────────────────────────
router.get('/content', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM cms_sections ORDER BY section_key');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/content', async (req, res) => {
  try {
    const { section_key, title, content, metadata } = req.body;
    const result = await pool.query(
      'INSERT INTO cms_sections (section_key,title,content,metadata) VALUES ($1,$2,$3,$4) ON CONFLICT (section_key) DO UPDATE SET title=$2,content=$3,metadata=$4,updated_at=NOW() RETURNING *',
      [section_key, title, content, JSON.stringify(metadata || {})]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/content/:key', async (req, res) => {
  try {
    const { title, content, metadata } = req.body;
    const result = await pool.query(
      'UPDATE cms_sections SET title=$1,content=$2,metadata=$3,updated_at=NOW() WHERE section_key=$4 RETURNING *',
      [title, content, JSON.stringify(metadata || {}), req.params.key]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Section not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/content/:key', async (req, res) => {
  try {
    await pool.query('DELETE FROM cms_sections WHERE section_key=$1', [req.params.key]);
    res.json({ message: 'Content section deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// REPORTS & ACTIVITY MONITORING
// ─────────────────────────────────────────────

// Overview report
router.get('/reports', async (req, res) => {
  try {
    const [userStats, campaignStats, taskStats, donationStats, enquiryStats] = await Promise.all([
      pool.query('SELECT role, COUNT(*) as count FROM users GROUP BY role ORDER BY count DESC'),
      pool.query('SELECT status, COUNT(*) as count FROM campaigns GROUP BY status'),
      pool.query('SELECT status, COUNT(*) as count FROM task_assignments GROUP BY status'),
      pool.query(`SELECT DATE_TRUNC('month', created_at) as month, SUM(amount) as total FROM donations WHERE status='completed' GROUP BY month ORDER BY month DESC LIMIT 12`),
      pool.query("SELECT status, COUNT(*) as count FROM enquiries GROUP BY status"),
    ]);

    res.json({
      userStats:     userStats.rows,
      campaignStats: campaignStats.rows,
      taskStats:     taskStats.rows,
      donationTrends: donationStats.rows,
      enquiryStats:  enquiryStats.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Detailed overview with totals
router.get('/reports/overview', async (req, res) => {
  try {
    const [users, campaigns, tasks, donations, submissions, enquiries, banners, ads] = await Promise.all([
      pool.query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_active=true) as active FROM users'),
      pool.query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status=\'active\') as active FROM campaigns'),
      pool.query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status=\'active\') as active FROM tasks'),
      pool.query('SELECT COUNT(*) as total, COALESCE(SUM(amount),0) as total_amount FROM donations WHERE status=\'completed\''),
      pool.query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status=\'APPROVED\') as approved FROM task_assignments'),
      pool.query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status=\'open\') as open FROM enquiries'),
      pool.query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_active=true) as active FROM banners'),
      pool.query('SELECT COUNT(*) as total, COALESCE(SUM(impressions),0) as impressions, COALESCE(SUM(clicks),0) as clicks FROM adsense_slots'),
    ]);
    res.json({
      users:       users.rows[0],
      campaigns:   campaigns.rows[0],
      tasks:       tasks.rows[0],
      donations:   donations.rows[0],
      submissions: submissions.rows[0],
      enquiries:   enquiries.rows[0],
      banners:     banners.rows[0],
      adsense:     ads.rows[0],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// User registration trends
router.get('/reports/users', async (req, res) => {
  try {
    const [roleStats, trends, activeCount, topEarners] = await Promise.all([
      pool.query('SELECT role, COUNT(*) as count FROM users GROUP BY role ORDER BY count DESC'),
      pool.query(`SELECT DATE_TRUNC('month', created_at) as month, COUNT(*) as registrations FROM users WHERE created_at >= NOW() - INTERVAL '12 months' GROUP BY month ORDER BY month DESC`),
      pool.query('SELECT COUNT(*) as count FROM users WHERE is_active=true'),
      pool.query('SELECT id,name,email,impact_points,level FROM users ORDER BY impact_points DESC LIMIT 10'),
    ]);
    res.json({
      roleStats:   roleStats.rows,
      trends:      trends.rows,
      activeUsers: parseInt(activeCount.rows[0].count),
      topEarners:  topEarners.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Donation analytics
router.get('/reports/donations', async (req, res) => {
  try {
    const { from, to } = req.query;
    const dateFilter = from && to ? `AND d.created_at BETWEEN '${from}' AND '${to}'` : '';

    const [monthly, byCampaign, topDonors] = await Promise.all([
      pool.query(`SELECT DATE_TRUNC('month', created_at) as month, SUM(amount) as total, COUNT(*) as count FROM donations WHERE status='completed' ${dateFilter} GROUP BY month ORDER BY month DESC LIMIT 12`),
      pool.query(`SELECT c.title, SUM(d.amount) as total, COUNT(d.id) as count FROM donations d JOIN campaigns c ON d.campaign_id=c.id WHERE d.status='completed' ${dateFilter} GROUP BY c.title ORDER BY total DESC LIMIT 10`),
      pool.query(`SELECT donor_name, donor_email, SUM(amount) as total_donated, COUNT(*) as donation_count FROM donations WHERE status='completed' ${dateFilter} GROUP BY donor_name, donor_email ORDER BY total_donated DESC LIMIT 10`),
    ]);
    res.json({
      monthly:    monthly.rows,
      byCampaign: byCampaign.rows,
      topDonors:  topDonors.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Activity log
router.get('/reports/activity', async (req, res) => {
  try {
    const { days = 30, page = 1, limit = 50 } = req.query;
    const [logs, byAction] = await Promise.all([
      pool.query(
        `SELECT al.*,u.name as user_name,u.email as user_email FROM activity_logs al LEFT JOIN users u ON al.user_id=u.id WHERE al.created_at >= NOW() - INTERVAL '${parseInt(days)} days' ORDER BY al.created_at DESC LIMIT $1 OFFSET $2`,
        [limit, (page-1)*limit]
      ),
      pool.query(
        `SELECT action, COUNT(*) as count FROM activity_logs WHERE created_at >= NOW() - INTERVAL '${parseInt(days)} days' GROUP BY action ORDER BY count DESC`
      ),
    ]);
    res.json({ logs: logs.rows, byAction: byAction.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Log an admin action
router.post('/reports/activity', async (req, res) => {
  try {
    const { action, details, user_id } = req.body;
    const result = await pool.query(
      'INSERT INTO activity_logs (user_id,action,details) VALUES ($1,$2,$3) RETURNING *',
      [user_id || req.admin.id || null, action, details]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AdSense analytics
router.get('/reports/adsense', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT slot_name, slot_type, page_placement,
             impressions, clicks,
             CASE WHEN impressions > 0 THEN ROUND((clicks::numeric/impressions)*100, 2) ELSE 0 END as ctr,
             is_active
      FROM adsense_slots
      ORDER BY impressions DESC
    `);
    const totals = await pool.query(`
      SELECT SUM(impressions) as total_impressions, SUM(clicks) as total_clicks,
             CASE WHEN SUM(impressions) > 0 THEN ROUND((SUM(clicks)::numeric/SUM(impressions))*100,2) ELSE 0 END as avg_ctr
      FROM adsense_slots
    `);
    res.json({ slots: result.rows, totals: totals.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
