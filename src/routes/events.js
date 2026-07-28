const express = require('express');
const router = express.Router();
const verifyUser = require('../middlewares/authMiddleware');
const { sanitizeBody } = require('../middlewares/sanitize');
const { validateEventData, validateQueryPagination } = require('../middlewares/validate');
const { cacheMiddleware } = require('../middlewares/cache');
const controller = require('../controllers/eventController');

router.use(verifyUser, sanitizeBody);

router.get('/', validateQueryPagination, cacheMiddleware('events'), controller.list);
router.get('/:id', controller.getOne);
router.post('/', validateEventData, controller.create);
router.put('/:id', validateEventData, controller.update);
router.delete('/:id', controller.remove);

module.exports = router;
