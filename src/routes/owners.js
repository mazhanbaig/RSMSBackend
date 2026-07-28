const express = require('express');
const router = express.Router();
const verifyUser = require('../middlewares/authMiddleware');
const { sanitizeBody } = require('../middlewares/sanitize');
const { validateOwnerData, validateQueryPagination } = require('../middlewares/validate');
const { cacheMiddleware } = require('../middlewares/cache');
const controller = require('../controllers/ownerController');

router.use(verifyUser, sanitizeBody);

router.get('/', validateQueryPagination, cacheMiddleware('owners'), controller.list);
router.get('/:id', controller.getOne);
router.post('/', validateOwnerData, controller.create);
router.put('/:id', validateOwnerData, controller.update);
router.delete('/:id', controller.remove);

module.exports = router;
