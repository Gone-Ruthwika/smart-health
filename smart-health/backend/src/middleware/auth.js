const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { getAuthorizedCenters, isMainAdmin } = require('../utils/adminAccess');

const authenticate = async (req, res, next) => {
  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ success: false, message: 'JWT auth is not configured' });
  }

  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }
  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await db.query(
      'SELECT id, name, email, role, admin_scope FROM users WHERE id=? LIMIT 1',
      [decoded.id]
    );
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    if (user.role === 'admin') {
      const access = await getAuthorizedCenters(user.id);
      req.user = { ...user, ...access };
    } else {
      req.user = user;
    }

    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

const authorizeAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
};

const authorizeMainAdmin = (req, res, next) => {
  if (!isMainAdmin(req.user)) {
    return res.status(403).json({ success: false, message: 'Main admin access required' });
  }
  next();
};

module.exports = { authenticate, authorizeAdmin, authorizeMainAdmin };
