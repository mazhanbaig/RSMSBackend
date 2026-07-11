const express = require('express');
const router = express.Router();
const verifyUser = require('../middlewares/authMiddleware');
const { validateTaskData } = require('../middlewares/validate');
const controller = require('../controllers/taskController');

router.get('/', verifyUser, controller.list);
router.get('/:id', verifyUser, controller.getOne);
router.post('/', verifyUser, validateTaskData, controller.create);
router.put('/:id', verifyUser, validateTaskData, controller.update);
router.delete('/:id', verifyUser, controller.remove);

module.exports = router;
