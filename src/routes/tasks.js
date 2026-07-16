const express = require('express');
const router = express.Router();
const verifyUser = require('../middlewares/authMiddleware');
const { validateTaskData } = require('../middlewares/validate');
const controller = require('../controllers/taskController');

router.use(verifyUser);

router.get('/', controller.list);
router.get('/:id', controller.getOne);
router.post('/', validateTaskData, controller.create);
router.put('/:id', validateTaskData, controller.update);
router.delete('/:id', controller.remove);

module.exports = router;
