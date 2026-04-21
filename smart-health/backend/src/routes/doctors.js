const router = require('express').Router();
const ctrl = require('../controllers/doctorController');

router.get('/', ctrl.getDoctors);
router.get('/:id', ctrl.getDoctorById);
router.get('/:id/slots', ctrl.getDoctorSlots);

module.exports = router;
