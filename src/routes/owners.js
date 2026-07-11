const express = require('express');
const router = express.Router();
const verifyUser = require('../middlewares/authMiddleware');
const { validateOwnerData } = require('../middlewares/validate');
const controller = require('../controllers/ownerController');

router.get('/', verifyUser, controller.list);
router.get('/:id', verifyUser, controller.getOne);
router.post('/', verifyUser, validateOwnerData, controller.create);
router.put('/:id', verifyUser, validateOwnerData, controller.update);
router.delete('/:id', verifyUser, controller.remove);

module.exports = router;
