const express = require('express');
const router = express.Router();
const verifyUser = require('../middlewares/authMiddleware');
const { sanitizeBody } = require('../middlewares/sanitize');
const { validateClientData, validateQueryPagination } = require('../middlewares/validate');
const { cacheMiddleware } = require('../middlewares/cache');
const controller = require('../controllers/clientController');

router.use(verifyUser, sanitizeBody);

router.get('/', validateQueryPagination, cacheMiddleware('clients'), controller.list);
router.get('/:id', controller.getOne);
router.post('/', validateClientData, controller.create);
router.put('/:id', validateClientData, controller.update);
router.patch('/:id/pipeline', controller.updatePipelineStage);
router.delete('/:id', controller.remove);

module.exports = router;
