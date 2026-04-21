const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const db = require('../config/db');

router.use(authenticate);

router.get('/', asyncHandler(async (req, res) => {
  const result = await db.query(
    'SELECT id, name, email, phone, role, date_of_birth, blood_group, address, emergency_contact, created_at FROM users WHERE id=?',
    [req.user.id]
  );
  res.json({ success: true, user: result.rows[0] });
}));

router.patch('/', asyncHandler(async (req, res) => {
  const { name, phone, date_of_birth, blood_group, address, emergency_contact } = req.body;
  await db.query(
    `UPDATE users SET name=?, phone=?, date_of_birth=?, blood_group=?, address=?, emergency_contact=?, updated_at=NOW()
     WHERE id=?`,
    [name, phone || null, date_of_birth || null, blood_group || null, address || null, emergency_contact || null, req.user.id]
  );
  const result = await db.query(
    'SELECT id, name, email, phone, role, date_of_birth, blood_group, address, emergency_contact FROM users WHERE id=?',
    [req.user.id]
  );
  res.json({ success: true, user: result.rows[0] });
}));

module.exports = router;
