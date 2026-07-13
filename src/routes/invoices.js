const express = require('express');
const router = express.Router();
const verifyUser = require('../middlewares/authMiddleware');
const { validateInvoiceData } = require('../middlewares/validate');
const controller = require('../controllers/invoiceController');

router.get('/', verifyUser, controller.list);
router.get('/:id', verifyUser, controller.getOne);
router.post('/', verifyUser, validateInvoiceData, controller.create);
router.put('/:id', verifyUser, validateInvoiceData, controller.update);
router.delete('/:id', verifyUser, controller.remove);

module.exports = router;
