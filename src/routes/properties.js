const express = require('express');
const router = express.Router();
const verifyUser = require('../middlewares/authMiddleware');
const { validatePropertyData } = require('../middlewares/validate');
const controller = require('../controllers/propertyController');

router.get('/', verifyUser, controller.list);
router.get('/:id', verifyUser, controller.getOne);
router.post('/', verifyUser, validatePropertyData, controller.create);
router.put('/:id', verifyUser, validatePropertyData, controller.update);
router.patch('/:id/feature', verifyUser, controller.featureToggle);
router.delete('/:id', verifyUser, controller.remove);

module.exports = router;
