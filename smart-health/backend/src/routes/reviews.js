const router = require('express').Router();
const { body } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { asyncHandler } = require('../middleware/errorHandler');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');

// Get reviews for a center
router.get('/center/:centerId', asyncHandler(async (req, res) => {
  const result = await db.query(
    `SELECT r.*, u.name AS user_name FROM reviews r
     JOIN users u ON u.id = r.user_id
     WHERE r.center_id=? ORDER BY r.created_at DESC LIMIT 20`,
    [req.params.centerId]
  );
  const avg = await db.query(
    'SELECT AVG(rating) AS avg_rating, COUNT(*) AS total FROM reviews WHERE center_id=?',
    [req.params.centerId]
  );
  res.json({ success: true, reviews: result.rows, stats: avg.rows[0] });
}));

// Submit a review (authenticated)
router.post('/', authenticate,
  [
    body('center_id').notEmpty(),
    body('rating').isInt({ min: 1, max: 5 }),
    body('comment').optional().trim(),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { center_id, doctor_id, appointment_id, rating, comment } = req.body;
    const id = uuidv4();
    await db.query(
      `INSERT INTO reviews (id, user_id, center_id, doctor_id, appointment_id, rating, comment)
       VALUES (?,?,?,?,?,?,?)`,
      [id, req.user.id, center_id, doctor_id || null, appointment_id || null, rating, comment || null]
    );
    res.status(201).json({ success: true, message: 'Review submitted' });
  })
);

module.exports = router;
