const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const allowedOrigins = [
  process.env.FRONTEND_URL_DEV || 'http://localhost:5173',
  process.env.FRONTEND_URL_PROD || 'https://socialnews.vercel.app',
];

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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