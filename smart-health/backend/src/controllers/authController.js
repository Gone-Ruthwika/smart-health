const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const mailService = require('../services/mailService');
const { asyncHandler } = require('../middleware/errorHandler');
const { enrichAdminUser } = require('../utils/adminAccess');

const signToken = (user) => {
  if (!process.env.JWT_SECRET) {
    const error = new Error('JWT_SECRET is not configured');
    error.status = 500;
    throw error;
  }

  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, admin_scope: user.admin_scope || null },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

const sanitizeAuthPayload = (body = {}) => ({
  name: typeof body.name === 'string' ? body.name.trim() : '',
  email: typeof body.email === 'string' ? body.email.trim().toLowerCase() : '',
  password: typeof body.password === 'string' ? body.password : '',
  phone: typeof body.phone === 'string' ? body.phone.trim() : '',
});

exports.signup = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = sanitizeAuthPayload(req.body);

  console.log('[AUTH] Signup attempt', {
    email,
    hasName: Boolean(name),
    hasPhone: Boolean(phone),
    ip: req.ip,
  });

  try {
    const existing = await db.query('SELECT id FROM users WHERE email=? LIMIT 1', [email]);
    if (existing.rows.length) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const hash = await bcrypt.hash(password, 12);
    const id = uuidv4();

    await db.query(
      'INSERT INTO users (id, name, email, password_hash, phone, role) VALUES (?,?,?,?,?,?)',
      [id, name, email, hash, phone || null, 'user']
    );

    const user = { id, name, email, role: 'user', phone: phone || null };

    mailService.sendWelcome(user).catch((error) => {
      console.error('[AUTH] Welcome email failed', {
        email: user.email,
        message: error.message,
      });
    });

    return res.status(201).json({ success: true, token: signToken(user), user });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    console.error('[AUTH] Signup failed', {
      email,
      message: error.message,
      code: error.code,
      stack: error.stack,
    });

    return res.status(500).json({ success: false, message: 'Failed to create account' });
  }
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = sanitizeAuthPayload(req.body);

  console.log('[AUTH] Login attempt', { email, ip: req.ip });

  try {
    const result = await db.query('SELECT * FROM users WHERE email=? LIMIT 1', [email]);
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const { password_hash, ...safeUser } = user;
    const authUser = await enrichAdminUser(safeUser);
    return res.json({ success: true, token: signToken(authUser), user: authUser });
  } catch (error) {
    console.error('[AUTH] Login failed', {
      email,
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
    return res.status(500).json({ success: false, message: 'Failed to login' });
  }
});

exports.getMe = asyncHandler(async (req, res) => {
  const result = await db.query(
    'SELECT id, name, email, role, admin_scope, phone, created_at FROM users WHERE id=?',
    [req.user.id]
  );
  if (!result.rows.length) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }
  res.json({ success: true, user: await enrichAdminUser(result.rows[0]) });
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const { name, phone } = req.body;
  await db.query('UPDATE users SET name=?, phone=? WHERE id=?', [name, phone, req.user.id]);
  const result = await db.query('SELECT id, name, email, role, admin_scope, phone FROM users WHERE id=?', [req.user.id]);
  res.json({ success: true, user: await enrichAdminUser(result.rows[0]) });
});
