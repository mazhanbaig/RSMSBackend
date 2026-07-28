const express = require('express');
const router = express.Router();
const verifyUser = require('../middlewares/authMiddleware');
const { sanitizeBody } = require('../middlewares/sanitize');
const { validatePropertyData, validateQueryPagination } = require('../middlewares/validate');
const { cacheMiddleware } = require('../middlewares/cache');
const controller = require('../controllers/propertyController');

router.use(verifyUser, sanitizeBody);

router.get('/', validateQueryPagination, cacheMiddleware('properties'), controller.list);
router.get('/:id', controller.getOne);
router.post('/', validatePropertyData, controller.create);
router.put('/:id', validatePropertyData, controller.update);
router.patch('/:id/feature', controller.featureToggle);
router.patch('/:id/custom-fields', controller.updateCustomFields);
router.delete('/:id', controller.remove);

module.exports = router;
