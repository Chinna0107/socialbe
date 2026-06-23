const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const allowedOrigins = [
  process.env.FRONTEND_URL_DEV || 'http://localhost:5173',
  process.env.FRONTEND_URL_PROD || 'https://socialvoicenews.com',
  'https://socialvoicenews.com',
  'https://www.socialvoicenews.com',
].map(url => url.replace(/\/$/, ''));

// Handle preflight OPTIONS requests explicitly for Vercel
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    const origin = req.headers.origin;
    const isAllowed = !origin || allowedOrigins.includes(origin.replace(/\/$/, ''));
    if (isAllowed) {
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      return res.status(204).end();
    }
  }
  next();
});

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    const isAllowed = allowedOrigins.includes(origin.replace(/\/$/, ''));
    callback(isAllowed ? null : new Error('Not allowed by CORS'), isAllowed);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// File upload handled in respective routes (e.g., media.js using Cloudinary)

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/student', require('./routes/student'));
app.use('/api/campaigns', require('./routes/campaigns'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/quizzes', require('./routes/quizzes'));
app.use('/api/certificates', require('./routes/certificates'));
app.use('/api/marketplace', require('./routes/marketplace'));
app.use('/api/donations', require('./routes/donations'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/enquiries', require('./routes/enquiries'));
app.use('/api/content', require('./routes/content'));
app.use('/api/media', require('./routes/media'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/banners', require('./routes/banners'));
app.use('/api/adsense', require('./routes/adsense'));
app.use('/api/admin/news', require('./routes/news_admin'));
app.use('/api/news', require('./routes/news_public'));
app.use('/api/selfie-settings', require('./routes/selfie'));


// Root Route
app.get('/', (req, res) => {
  res.json({ message: 'Social News API is running!', timestamp: new Date().toISOString() });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

module.exports = app;