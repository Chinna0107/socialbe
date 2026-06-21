const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { authUser, authAdmin } = require('../middleware/auth');
const nodemailer = require('nodemailer');
require('dotenv').config();

const otpCache = new Map(); // Store OTPs in memory: { email: { otp: string, expires: number, verified: boolean } }

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false, 
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const signToken = (payload) => jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

// POST /api/auth/send-otp
router.post('/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const r = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
    if (r.rows.length) return res.status(409).json({ error: 'Email already registered' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 10 * 60 * 1000; // 10 mins

    otpCache.set(email, { otp, expires, verified: false });

    if (process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_USER !== 'your_email@gmail.com') {
      await transporter.sendMail({
        from: `"Social News" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Your Registration OTP',
        html: `<h3>Welcome to Social News!</h3><p>Your OTP for registration is: <strong style="font-size:24px;">${otp}</strong></p><p>It will expire in 10 minutes.</p>`
      });
      console.log(`[AUTH] Sent OTP to ${email} via email.`);
    } else {
      console.log(`[AUTH-DEV] Generated OTP for ${email}: ${otp}`);
    }

    res.json({ message: 'OTP sent successfully' });
  } catch (err) {
    console.error('Error sending OTP:', err);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required' });

  const record = otpCache.get(email);
  if (!record) return res.status(400).json({ error: 'No OTP found for this email. Please request a new one.' });

  if (Date.now() > record.expires) {
    otpCache.delete(email);
    return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
  }

  if (record.otp !== otp.toString()) {
    return res.status(400).json({ error: 'Invalid OTP' });
  }

  otpCache.set(email, { ...record, verified: true });
  res.json({ message: 'OTP verified successfully' });
});

// POST /api/auth/register — user/student
router.post('/register', async (req, res) => {
  const { name, email, password, phone, role, age, gender, college, address } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password required' });
  
  const record = otpCache.get(email);
  if (!record || !record.verified) {
    return res.status(400).json({ error: 'Email not verified via OTP' });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const studentId = `SN-${Date.now().toString(36).toUpperCase()}`;
    const r = await pool.query(
      'INSERT INTO users (name,email,password,phone,role,student_id,age,gender,college,address) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id,name,email,role,student_id,impact_points',
      [name, email, hash, phone || null, role || 'student', studentId, age || null, gender || null, college || null, address || null]
    );
    const token = signToken({ id: r.rows[0].id, email, role: r.rows[0].role });
    otpCache.delete(email); // Clean up cache
    res.status(201).json({ token, user: r.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already registered' });
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login — user + student (same endpoint)
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const r = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
    if (!r.rows.length) return res.status(401).json({ error: 'Invalid credentials' });
    const user = r.rows[0];
    if (user.is_active === false) return res.status(403).json({ error: 'Account deactivated' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = signToken({ id: user.id, email: user.email, role: user.role });
    await pool.query('INSERT INTO activity_logs (user_id,action) VALUES ($1,$2)', [user.id, 'login']);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, student_id: user.student_id, impact_points: user.impact_points, avatar: user.avatar } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/auth/admin-login
router.post('/admin-login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const r = await pool.query('SELECT * FROM admins WHERE email=$1', [email]);
    if (!r.rows.length) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, r.rows[0].password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = signToken({ id: r.rows[0].id, email: r.rows[0].email, role: 'admin' });
    res.json({ token, admin: { id: r.rows[0].id, name: r.rows[0].name, email: r.rows[0].email, role: 'admin' } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/auth/me
router.get('/me', authUser, async (req, res) => {
  try {
    const r = await pool.query('SELECT id,name,email,role,avatar,phone,impact_points,level,student_id,created_at,age,gender,college,address FROM users WHERE id=$1', [req.user.id]);
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/auth/profile
router.put('/profile', authUser, async (req, res) => {
  const { name, phone, avatar } = req.body;
  try {
    const r = await pool.query('UPDATE users SET name=$1,phone=$2,avatar=$3 WHERE id=$4 RETURNING id,name,email,role,avatar,phone,impact_points,level,student_id', [name, phone, avatar, req.user.id]);
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/auth/logout
router.post('/logout', authUser, async (req, res) => {
  try {
    await pool.query('INSERT INTO activity_logs (user_id, action) VALUES ($1, $2)', [req.user.id, 'logout']);
  } catch (_) {}
  res.json({ message: 'Logged out successfully', redirect: '/' });
});

module.exports = router;
