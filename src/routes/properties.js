const express = require('express');
const router = express.Router();
const verifyUser = require('../middlewares/authMiddleware');
const { requireViewerReadOnly } = require('../middlewares/requireRole');
const { validatePropertyData } = require('../middlewares/validate');
const controller = require('../controllers/propertyController');

router.use(verifyUser, requireViewerReadOnly);

router.get('/', controller.list);
router.get('/:id', controller.getOne);
router.post('/', validatePropertyData, controller.create);
router.put('/:id', validatePropertyData, controller.update);
router.patch('/:id/feature', controller.featureToggle);
router.patch('/:id/custom-fields', controller.updateCustomFields);
router.delete('/:id', controller.remove);

module.exports = router;
