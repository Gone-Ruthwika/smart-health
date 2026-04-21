const router = require('express').Router();
const { authenticate, authorizeAdmin, authorizeMainAdmin } = require('../middleware/auth');
const ctrl = require('../controllers/adminController');
const { asyncHandler } = require('../middleware/errorHandler');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { pool } = require('../config/db');
const { getAuthorizedCenters } = require('../utils/adminAccess');

router.use(authenticate, authorizeAdmin);

// Centers
router.post('/centers', ctrl.createCenter);
router.put('/centers/:id', ctrl.updateCenter);
router.delete('/centers/:id', ctrl.deleteCenter);

// Doctors
router.post('/doctors', ctrl.createDoctor);
router.put('/doctors/:id', ctrl.updateDoctor);
router.delete('/doctors/:id', ctrl.deleteDoctor);
router.put('/doctors/:id/slots', ctrl.updateDoctorSlots);

// Ambulances
router.get('/ambulances', ctrl.getAmbulances);
router.post('/ambulances', ctrl.createAmbulance);
router.put('/ambulances/:id', ctrl.updateAmbulance);
router.delete('/ambulances/:id', ctrl.deleteAmbulance);

// Appointments
router.get('/appointments', ctrl.getAllAppointments);
router.patch('/appointments/:id/status', ctrl.updateAppointmentStatus);

// Queue
router.get('/queue-status', ctrl.getQueueStatus);

// User management
router.get('/users', authorizeMainAdmin, asyncHandler(async (req, res) => {
  const result = await db.query(
    `SELECT id, name, email, role, admin_scope, phone, created_at
     FROM users
     ORDER BY created_at DESC`
  );
  const users = await Promise.all(result.rows.map(async (user) => ({
    ...user,
    ...(user.role === 'admin'
      ? await getAuthorizedCenters(user.id)
      : { authorized_center_ids: [], authorized_centers: [] }),
  })));
  res.json({ success: true, users });
}));

// Promote / demote role
router.patch('/users/:id/role', authorizeMainAdmin, asyncHandler(async (req, res) => {
  const { role, admin_scope, center_ids = [] } = req.body;
  if (!['user', 'admin'].includes(role)) {
    return res.status(400).json({ success: false, message: 'Invalid role' });
  }
  if (req.params.id === req.user.id && role === 'user') {
    return res.status(400).json({ success: false, message: 'Cannot demote yourself' });
  }
  if (role === 'admin' && !['main', 'hospital'].includes(admin_scope)) {
    return res.status(400).json({ success: false, message: 'Admin scope is required' });
  }
  if (role === 'admin' && admin_scope === 'hospital' && !center_ids.length) {
    return res.status(400).json({ success: false, message: 'Select at least one hospital for hospital admin' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute(
      'UPDATE users SET role=?, admin_scope=? WHERE id=?',
      [role, role === 'admin' ? admin_scope : null, req.params.id]
    );
    await conn.execute('DELETE FROM admin_center_access WHERE user_id=?', [req.params.id]);
    if (role === 'admin' && admin_scope === 'hospital') {
      for (const centerId of center_ids) {
        await conn.execute(
          'INSERT INTO admin_center_access (id, user_id, center_id) VALUES (?,?,?)',
          [uuidv4(), req.params.id, centerId]
        );
      }
    }
    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }

  res.json({ success: true, message: `Role updated to ${role}` });
}));

// Create admin account — ONLY accessible by existing admins, never public
router.post('/create-admin',
  authorizeMainAdmin,
  [
    body('name').trim().notEmpty().withMessage('Name required'),
    body('email').isEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('admin_scope').isIn(['main', 'hospital']).withMessage('Valid admin scope required'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { name, email, password, phone, admin_scope, center_ids = [] } = req.body;

    const existing = await db.query('SELECT id FROM users WHERE email=?', [email]);
    if (existing.rows.length) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }
    if (admin_scope === 'hospital' && !center_ids.length) {
      return res.status(400).json({ success: false, message: 'Select at least one hospital for hospital admin' });
    }

    const hash = await bcrypt.hash(password, 12);
    const id = uuidv4();
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute(
        `INSERT INTO users (id, name, email, password_hash, phone, role, admin_scope)
         VALUES (?,?,?,?,?,'admin',?)`,
        [id, name, email, hash, phone || null, admin_scope]
      );
      if (admin_scope === 'hospital') {
        for (const centerId of center_ids) {
          await conn.execute(
            'INSERT INTO admin_center_access (id, user_id, center_id) VALUES (?,?,?)',
            [uuidv4(), id, centerId]
          );
        }
      }
      await conn.commit();
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }

    // Log who created this admin
    console.log(`[AUDIT] Admin "${req.user.email}" created new admin account: ${email}`);

    res.status(201).json({
      success: true,
      message: `Admin account created for ${name}`,
      admin: { id, name, email, role: 'admin', admin_scope, center_ids }
    });
  })
);

// Delete user
router.delete('/users/:id', authorizeMainAdmin, asyncHandler(async (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ success: false, message: 'Cannot delete your own account' });
  }
  await db.query('DELETE FROM users WHERE id=?', [req.params.id]);
  res.json({ success: true, message: 'User deleted' });
}));

module.exports = router;
