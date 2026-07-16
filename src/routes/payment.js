const express = require('express')
const router = express.Router()
const verifyUser = require('../middlewares/authMiddleware')
const { validatePaymentData } = require('../middlewares/validate')
const paymentController = require('../controllers/paymentController')
const ResponseObj = require('../utils/ResponseObj')

// Gate checked BEFORE validation — prevents leaking validation rules when disabled
const paymentsGate = (req, res, next) => {
    if (process.env.PAYMENTS_ENABLED !== "true") {
        return res.status(403).json(ResponseObj(false, 'Payments are currently disabled', null, 'PAYMENTS_ENABLED is not set to true'))
    }
    next()
}

router.post("/create-payment", verifyUser, paymentsGate, validatePaymentData, paymentController.createPayment)

module.exports = router