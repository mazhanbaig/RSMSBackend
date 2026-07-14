const express = require('express');
const router = express.Router();
const verifyUser = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/requireRole');
const { validateInvoiceData } = require('../middlewares/validate');
const controller = require('../controllers/invoiceController');

router.get('/', verifyUser, controller.list);
router.get('/:id', verifyUser, controller.getOne);
router.post('/', verifyUser, requireRole('owner'), validateInvoiceData, controller.create);
router.put('/:id', verifyUser, requireRole('owner'), validateInvoiceData, controller.update);
router.delete('/:id', verifyUser, requireRole('owner'), controller.remove);

module.exports = router;
