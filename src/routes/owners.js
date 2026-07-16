const express = require('express');
const router = express.Router();
const verifyUser = require('../middlewares/authMiddleware');
const { validateOwnerData } = require('../middlewares/validate');
const controller = require('../controllers/ownerController');

router.use(verifyUser);

router.get('/', controller.list);
router.get('/:id', controller.getOne);
router.post('/', validateOwnerData, controller.create);
router.put('/:id', validateOwnerData, controller.update);
router.delete('/:id', controller.remove);

module.exports = router;
