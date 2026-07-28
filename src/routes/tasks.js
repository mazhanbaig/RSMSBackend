const express = require('express');
const router = express.Router();
const verifyUser = require('../middlewares/authMiddleware');
const { sanitizeBody } = require('../middlewares/sanitize');
const { validateTaskData, validateQueryPagination } = require('../middlewares/validate');
const { cacheMiddleware } = require('../middlewares/cache');
const controller = require('../controllers/taskController');

router.use(verifyUser, sanitizeBody);

router.get('/', validateQueryPagination, cacheMiddleware('tasks'), controller.list);
router.get('/:id', controller.getOne);
router.post('/', validateTaskData, controller.create);
router.put('/:id', validateTaskData, controller.update);
router.delete('/:id', controller.remove);

module.exports = router;
