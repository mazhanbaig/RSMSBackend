const express = require('express');
const router = express.Router();
const verifyUser = require('../middlewares/authMiddleware');
const controller = require('../controllers/activityController');

router.get('/', verifyUser, controller.list);

module.exports = router;
