const router = require('express').Router();
const pool = require('../db');
const { authUser } = require('../middleware/auth');
const multer = require('multer');

// Apply user auth to all routes
router.use(authUser);

// File upload configuration
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

// Dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const [user, taskStats, certRows, quizAvgRow, campaignCount, taskPipeline, activityRows] = await Promise.all([
      pool.query('SELECT id,name,email,role,avatar,phone,impact_points,level,student_id,is_active,created_at FROM users WHERE id=$1', [req.user.id]),
      pool.query(`SELECT status, COUNT(*) as count, COALESCE(SUM(points_earned),0) as points FROM task_assignments WHERE user_id=$1 GROUP BY status`, [req.user.id]),
      pool.query('SELECT id, title, issued_at FROM certificates WHERE user_id=$1 ORDER BY issued_at DESC LIMIT 5', [req.user.id]),
      pool.query('SELECT COALESCE(AVG(score),0) as avg FROM quiz_attempts WHERE user_id=$1 AND status=\'COMPLETED\'', [req.user.id]),
      pool.query('SELECT COUNT(*) FROM campaign_registrations WHERE user_id=$1', [req.user.id]),
      pool.query(`
        SELECT t.id, t.id as _id, t.title, t.description, t.priority, t.points, ta.status
        FROM tasks t
        LEFT JOIN task_assignments ta ON t.id = ta.task_id AND ta.user_id = $1
        WHERE t.status = 'active'
      `, [req.user.id]),
      pool.query('SELECT action, details, created_at FROM activity_logs WHERE user_id=$1 ORDER BY created_at DESC LIMIT 5', [req.user.id]),
    ]);

    const statusMap = {};
    taskStats.rows.forEach(r => { statusMap[r.status] = { count: parseInt(r.count), points: parseInt(r.points) }; });
    const totalTasks = taskPipeline.rows.length;
    const approvedCount = statusMap['APPROVED']?.count || 0;
    const completionRate = totalTasks > 0 ? Math.round((approvedCount / totalTasks) * 100) : 0;

    const pipeline = { pending: [], inProgress: [], submitted: [], approved: [] };
    taskPipeline.rows.forEach(t => {
      if (!t.status || t.status === 'PENDING') pipeline.pending.push(t);
      else if (t.status === 'IN_PROGRESS') pipeline.inProgress.push(t);
      else if (t.status === 'SUBMITTED') pipeline.submitted.push(t);
      else if (t.status === 'APPROVED') pipeline.approved.push(t);
    });

    const u = user.rows[0];
    res.json({
      user: u,
      stats: {
        tasks: totalTasks,
        campaigns: parseInt(campaignCount.rows[0].count),
        quizAvg: Math.round(parseFloat(quizAvgRow.rows[0].avg)),
        certificates: certRows.rows.length,
        totalPoints: statusMap['APPROVED']?.points || 0,
        impactPoints: u.impact_points || 0,
      },
      taskPipeline: pipeline,
      certificates: certRows.rows.map(c => ({ _id: c.id, title: c.title, verifiedDate: new Date(c.issued_at).toLocaleDateString() })),
      activityFeed: activityRows.rows.map((a, i) => ({
        id: i,
        type: a.action,
        title: a.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        description: a.details || '',
        time: new Date(a.created_at).toLocaleDateString(),
      })),
      performanceData: [],
      idCard: { name: u.name, role: u.role, avatar: u.avatar, studentId: u.student_id, level: u.level },
      completionRate,
      nextAchievement: { name: 'Visionary Leader', progress: Math.min(completionRate + 15, 100) },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Profile Management
router.put('/profile', async (req, res) => {
  try {
    const { name, phone, avatar } = req.body;
    const result = await pool.query(
      'UPDATE users SET name=$1, phone=$2, avatar=$3 WHERE id=$4 RETURNING id,name,email,role,avatar,phone,impact_points,level,student_id',
      [name, phone, avatar, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Campaign Registration
router.get('/campaigns', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, 
        CASE WHEN cr.user_id IS NOT NULL THEN true ELSE false END as is_registered
      FROM campaigns c
      LEFT JOIN campaign_registrations cr ON c.id = cr.campaign_id AND cr.user_id = $1
      WHERE c.status = 'active'
      ORDER BY c.created_at DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/campaigns/:id/register', async (req, res) => {
  try {
    const campaignId = req.params.id;
    const result = await pool.query(
      'INSERT INTO campaign_registrations (user_id, campaign_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING *',
      [req.user.id, campaignId]
    );
    
    // Also fetch the campaign title to create a meaningful notification
    if (result.rows.length > 0) {
      const camp = await pool.query('SELECT title FROM campaigns WHERE id=$1', [campaignId]);
      const title = camp.rows[0]?.title || 'a campaign';
      await pool.query(
        'INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)',
        [req.user.id, 'Registration Confirmed', `You have successfully registered for the campaign: ${title}`, 'success']
      );
    }

    res.json({ message: 'Registered successfully', registration: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Tasks
router.get('/tasks', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*, ta.status as assignment_status, ta.submission_image, ta.points_earned, ta.submitted_at
      FROM tasks t
      LEFT JOIN task_assignments ta ON t.id = ta.task_id AND ta.user_id = $1
      WHERE t.status = 'active'
      ORDER BY t.created_at DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/tasks/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, ta.status as assignment_status, ta.submission_note, ta.submission_files, ta.points_earned, ta.submitted_at
       FROM tasks t
       LEFT JOIN task_assignments ta ON t.id = ta.task_id AND ta.user_id = $1
       WHERE t.id = $2`,
      [req.user.id, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Task not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/tasks/:id/submit', upload.array('files', 10), async (req, res) => {
  try {
    const note = req.body.note || null;
    const imageUrl = req.body.imageUrl || null;
    const filePaths = req.files ? req.files.map(f => f.path) : [];
    const result = await pool.query(
      `INSERT INTO task_assignments (task_id, user_id, submission_note, submission_image, submission_files, status, submitted_at)
       VALUES ($1, $2, $3, $4, $5, 'SUBMITTED', NOW())
       ON CONFLICT (task_id, user_id) DO UPDATE
       SET submission_note=$3, submission_image=$4, submission_files=$5, status='SUBMITTED', submitted_at=NOW()
       RETURNING *`,
      [req.params.id, req.user.id, note, imageUrl, JSON.stringify(filePaths)]
    );
    await pool.query('INSERT INTO activity_logs (user_id, action, details) VALUES ($1, $2, $3)',
      [req.user.id, 'task_submission', `Submitted task ${req.params.id}`]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Quizzes
router.get('/quizzes', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT q.id, q.id as _id, q.title, q.description, q.total_questions as questions,
             q.time_limit as "timeLimit",
             COALESCE(qa.score, null) as score,
             COALESCE(qa.status, 'PENDING') as status,
             qa.completed_at
      FROM quizzes q
      LEFT JOIN quiz_attempts qa ON q.id = qa.quiz_id AND qa.user_id = $1
      WHERE q.status = 'active'
      ORDER BY q.created_at DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/quizzes/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM quizzes WHERE id=$1 AND status=\'active\'', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Quiz not found' });
    const quiz = result.rows[0];
    // Frontend reads questionList; DB stores as questions
    res.json({ ...quiz, questionList: quiz.questions || [], timeLimit: quiz.time_limit || 20 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const issueCertificate = async (userId, quizId, quizTitle, score) => {
  const certId = `CERT-${userId}-${quizId}`.slice(0, 30);
  await pool.query(
    `INSERT INTO certificates (id, user_id, title, score, quiz_id, type, issued_at, is_verified)
     VALUES ($1, $2, $3, $4, $5, 'quiz', NOW(), true)
     ON CONFLICT (user_id, quiz_id) WHERE quiz_id IS NOT NULL
     DO UPDATE SET score=EXCLUDED.score, issued_at=NOW()`,
    [certId, userId, quizTitle + ' Certificate', score, quizId]
  );
};

const handleQuizSubmit = async (req, res) => {
  try {
    const { answers } = req.body;
    const quiz = await pool.query('SELECT * FROM quizzes WHERE id=$1', [req.params.id]);
    if (!quiz.rows.length) return res.status(404).json({ error: 'Quiz not found' });

    const questions = quiz.rows[0].questions || [];
    let correct = 0;
    questions.forEach((q, i) => {
      if (answers[i] !== undefined && answers[i] === (q.correct_answer ?? q.correct)) correct++;
    });
    const total = questions.length || 1;
    const scorePercent = Math.round((correct / total) * 100);

    const result = await pool.query(
      `INSERT INTO quiz_attempts (quiz_id, user_id, score, answers, status, completed_at)
       VALUES ($1, $2, $3, $4, 'COMPLETED', NOW())
       ON CONFLICT (quiz_id, user_id) DO UPDATE
       SET score=$3, answers=$4, status='COMPLETED', completed_at=NOW()
       RETURNING *`,
      [req.params.id, req.user.id, scorePercent, JSON.stringify(answers)]
    );

    await pool.query('INSERT INTO activity_logs (user_id, action, details) VALUES ($1, $2, $3)',
      [req.user.id, 'quiz_submission', `Submitted quiz ${req.params.id} with score ${scorePercent}%`]);

    if (scorePercent >= 70) {
      await issueCertificate(req.user.id, req.params.id, quiz.rows[0].title, scorePercent);
    }

    res.json({ score: scorePercent, total: questions.length, attempt: result.rows[0], passed: scorePercent >= 70 });
  } catch (err) {
    console.error('Quiz submit error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

router.post('/quizzes/:id/participate', handleQuizSubmit);
router.post('/quizzes/:id/submit', handleQuizSubmit);

// Progress Tracking
router.get('/progress', async (req, res) => {
  try {
    const [taskProgress, quizProgress, pointsHistory] = await Promise.all([
      pool.query(`
        SELECT status, COUNT(*) as count 
        FROM task_assignments 
        WHERE user_id=$1 
        GROUP BY status
      `, [req.user.id]),
      pool.query(`
        SELECT status, COUNT(*) as count 
        FROM quiz_attempts 
        WHERE user_id=$1 
        GROUP BY status
      `, [req.user.id]),
      pool.query(`
        SELECT DATE_TRUNC('day', approved_at) as date, SUM(points_earned) as points
        FROM task_assignments 
        WHERE user_id=$1 AND status='APPROVED'
        GROUP BY date
        ORDER BY date DESC
        LIMIT 30
      `, [req.user.id])
    ]);
    
    res.json({
      taskProgress: taskProgress.rows,
      quizProgress: quizProgress.rows,
      pointsHistory: pointsHistory.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Certificates
router.get('/certificates', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM certificates WHERE user_id=$1 ORDER BY issued_at DESC', [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ID Card Generation
router.get('/id-card', async (req, res) => {
  try {
    const user = await pool.query('SELECT * FROM users WHERE id=$1', [req.user.id]);
    res.json({
      user: user.rows[0],
      qrData: `SN-${user.rows[0].student_id}`,
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Marketplace
router.get('/marketplace', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products WHERE status=\'active\' ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/marketplace/order', async (req, res) => {
  try {
    const { items, total, address } = req.body;
    const orderId = `ORD-${Date.now().toString(36).toUpperCase()}`;
    const result = await pool.query(
      'INSERT INTO orders (id, user_id, items, total, address) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [orderId, req.user.id, JSON.stringify(items), total, address]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/orders', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM orders WHERE user_id=$1 ORDER BY created_at DESC', [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Donations
router.get('/donations/history', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.*, c.title as campaign_title
      FROM donations d
      LEFT JOIN campaigns c ON d.campaign_id = c.id
      WHERE d.user_id = $1
      ORDER BY d.created_at DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Notifications
router.get('/notifications', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50', [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/notifications/:id/read', async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read=true WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Enquiry
router.post('/enquiry', async (req, res) => {
  try {
    const { subject, message } = req.body;
    const user = await pool.query('SELECT name, email FROM users WHERE id=$1', [req.user.id]);
    const result = await pool.query(
      'INSERT INTO enquiries (user_id, name, email, subject, message) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.user.id, user.rows[0].name, user.rows[0].email, subject, message]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Activity History
router.get('/activity', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM activity_logs WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100', [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;