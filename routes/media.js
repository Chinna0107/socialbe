require('dotenv').config();
const router = require('express').Router();
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const { authAny } = require('../middleware/auth');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'socialnews',
    allowed_formats: ['jpeg', 'jpg', 'png', 'gif', 'pdf', 'doc', 'docx'],
    resource_type: 'auto',
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.post('/upload', authAny, upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    res.json({
      filename: req.file.filename,
      originalname: req.file.originalname,
      size: req.file.size,
      url: req.file.path,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
