const express = require('express');
const router = express.Router();
const verifyUser = require('../middlewares/authMiddleware');
const controller = require('../controllers/approvalController');

router.get('/', verifyUser, controller.list);
router.get('/pending-reviews', verifyUser, controller.pendingReviews);
router.get('/:id', verifyUser, controller.getOne);
router.post('/', verifyUser, controller.create);
router.patch('/:id/review', verifyUser, controller.review);
router.delete('/:id', verifyUser, controller.remove);

module.exports = router;
