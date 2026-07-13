const express = require('express');
const router = express.Router();
const verifyUser = require('../middlewares/authMiddleware');
const { validateClientData } = require('../middlewares/validate');
const controller = require('../controllers/clientController');

router.get('/', verifyUser, controller.list);
router.get('/:id', verifyUser, controller.getOne);
router.post('/', verifyUser, validateClientData, controller.create);
router.put('/:id', verifyUser, validateClientData, controller.update);
router.patch('/:id/pipeline', verifyUser, controller.updatePipelineStage);
router.delete('/:id', verifyUser, controller.remove);

module.exports = router;
