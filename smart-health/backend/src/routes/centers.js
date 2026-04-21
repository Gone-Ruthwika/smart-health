const router = require('express').Router();
const ctrl = require('../controllers/centerController');

router.get('/', ctrl.getCenters);
router.get('/nearby', ctrl.getNearbyCenters);
router.get('/:id', ctrl.getCenterById);

module.exports = router;
