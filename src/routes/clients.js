const express = require('express');
const router = express.Router();
const verifyUser = require('../middlewares/authMiddleware');
const { requireViewerReadOnly } = require('../middlewares/requireRole');
const { validateClientData } = require('../middlewares/validate');
const controller = require('../controllers/clientController');

router.use(verifyUser, requireViewerReadOnly);

router.get('/', controller.list);
router.get('/:id', controller.getOne);
router.post('/', validateClientData, controller.create);
router.put('/:id', validateClientData, controller.update);
router.patch('/:id/pipeline', controller.updatePipelineStage);
router.delete('/:id', controller.remove);

module.exports = router;
