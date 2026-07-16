const express = require('express');
const router = express.Router();
const verifyUser = require('../middlewares/authMiddleware');
const { validateEventData } = require('../middlewares/validate');
const controller = require('../controllers/eventController');

router.use(verifyUser);

router.get('/', controller.list);
router.get('/:id', controller.getOne);
router.post('/', validateEventData, controller.create);
router.put('/:id', validateEventData, controller.update);
router.delete('/:id', controller.remove);

module.exports = router;
