const express = require('express')
const router = express.Router()
const verifyUser = require('../middlewares/authMiddleware')
const { validatePaymentData } = require('../middlewares/validate')
const paymentController = require('../controllers/paymentController')

router.post("/create-payment", verifyUser, validatePaymentData, paymentController.createPayment)

module.exports = router