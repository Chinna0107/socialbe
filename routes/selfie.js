const router = require('express').Router();
const pool = require('../db');
const { authAdmin } = require('../middleware/auth');

// Ensure selfie_settings table exists
async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS selfie_settings (
      id SERIAL PRIMARY KEY,
      campaign_title VARCHAR(200) DEFAULT 'Proud Supporter',
      campaign_subtitle VARCHAR(200) DEFAULT 'Social News Campaign',
      accent_color VARCHAR(20) DEFAULT '#E31B23',
      frame_color VARCHAR(20) DEFAULT '#011B4A',
      watermark_text VARCHAR(100) DEFAULT 'SOCIALNEWS.ORG',
      hashtag VARCHAR(100) DEFAULT '#SocialNewsCampaign',
      is_active BOOLEAN DEFAULT TRUE,
      updated_at TIMESTAMP DEFAULT NOW()
    );
    INSERT INTO selfie_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
  `);
}

ensureTable().catch(console.error);

// GET /api/selfie-settings  (public - for students/users)
router.get('/', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM selfie_settings WHERE id=1');
    res.json(r.rows[0] || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/selfie-settings  (admin only)
router.put('/', authAdmin, async (req, res) => {
  const { campaign_title, campaign_subtitle, accent_color, frame_color, watermark_text, hashtag, is_active } = req.body;
  try {
    const r = await pool.query(
      `UPDATE selfie_settings SET
        campaign_title = COALESCE($1, campaign_title),
        campaign_subtitle = COALESCE($2, campaign_subtitle),
        accent_color = COALESCE($3, accent_color),
        frame_color = COALESCE($4, frame_color),
        watermark_text = COALESCE($5, watermark_text),
        hashtag = COALESCE($6, hashtag),
        is_active = COALESCE($7, is_active),
        updated_at = NOW()
      WHERE id = 1 RETURNING *`,
      [campaign_title, campaign_subtitle, accent_color, frame_color, watermark_text, hashtag, is_active]
    );
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
