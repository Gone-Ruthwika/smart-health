const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const ctrl = require('../controllers/emergencyController');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

router.post(
  '/guest-book',
  [
    body('center_id').notEmpty().withMessage('center_id is required'),
    body('appointment_date').isDate().withMessage('Valid date required'),
    body('appointment_time').matches(/^\d{2}:\d{2}$/).withMessage('Valid time required (HH:MM)'),
    body('issue').optional().isString(),
    body('guest_name').optional().isString(),
    body('guest_phone').optional().isString(),
    body('language').optional().isString(),
    body('location_label').optional().isString(),
  ],
  validate,
  ctrl.createGuestEmergencyAppointment
);

router.post(
  '/ambulance-book',
  [
    body('center_id').notEmpty().withMessage('center_id is required'),
    body('requester_name').trim().notEmpty().withMessage('requester_name is required'),
    body('requester_phone').optional().isString(),
    body('service_name').optional().isString(),
    body('service_phone').optional().isString(),
    body('pickup_label').optional().isString(),
    body('pickup_lat').isFloat({ min: -90, max: 90 }).withMessage('Valid pickup latitude required'),
    body('pickup_lng').isFloat({ min: -180, max: 180 }).withMessage('Valid pickup longitude required'),
    body('eta_minutes').optional().isInt({ min: 1, max: 180 }),
    body('language').optional().isString(),
  ],
  validate,
  ctrl.createAmbulanceRequest
);

router.get('/ambulance-requests', authenticate, authorizeAdmin, ctrl.getAmbulanceRequests);
router.get('/ambulance-services/nearby', ctrl.getNearbyAmbulanceServices);
router.get('/ambulance-book/:id', ctrl.getAmbulanceRequest);

router.patch(
  '/ambulance-book/:id/status',
  authenticate,
  authorizeAdmin,
  [
    body('status').isIn(['requested', 'assigned', 'arriving', 'completed', 'cancelled']).withMessage('Valid status required'),
    body('eta_minutes').optional().isInt({ min: 0, max: 180 }).withMessage('eta_minutes must be between 0 and 180'),
  ],
  validate,
  ctrl.updateAmbulanceRequestStatus
);

module.exports = router;
