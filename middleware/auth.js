const jwt = require('jsonwebtoken');
require('dotenv').config();

const authUser = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Allow all user types except admin
    if (decoded.role === 'admin') {
      return res.status(403).json({ error: 'User access required' });
    }
    req.user = decoded;
    next();
  } catch (err) { 
    res.status(401).json({ error: 'Invalid or expired token' }); 
  }
};

const authAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    req.admin = decoded;
    req.user = decoded; // Also set req.user for consistency
    next();
  } catch (err) { 
    res.status(401).json({ error: 'Invalid or expired token' }); 
  }
};

const authAny = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch { res.status(401).json({ error: 'Invalid token' }); }
};

module.exports = { authUser, authAdmin, authAny };
