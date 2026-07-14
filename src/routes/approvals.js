const express = require('express');
const router = express.Router();
const verifyUser = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/requireRole');
const controller = require('../controllers/approvalController');

router.get('/', verifyUser, controller.list);
router.get('/pending-reviews', verifyUser, controller.pendingReviews);
router.get('/:id', verifyUser, controller.getOne);
router.post('/', verifyUser, controller.create);
router.patch('/:id/review', verifyUser, requireRole('owner'), controller.review);
router.delete('/:id', verifyUser, requireRole('owner'), controller.remove);

module.exports = router;
