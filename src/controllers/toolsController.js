const ResponseObj = require('../utils/ResponseObj');
const { calculateInstallmentPlan } = require('../services/calculatorService');

async function installmentCalculator(req, res) {
    try {
        const { totalPrice, downPayment, months, interestRate } = req.body;

        if (!totalPrice || totalPrice <= 0) {
            return res.status(400).json(ResponseObj(false, 'totalPrice must be a positive number'));
        }
        if (downPayment === undefined || downPayment < 0) {
            return res.status(400).json(ResponseObj(false, 'downPayment must be a non-negative number'));
        }
        if (!months || months < 1 || !Number.isInteger(months)) {
            return res.status(400).json(ResponseObj(false, 'months must be a positive integer'));
        }
        if (downPayment >= totalPrice) {
            return res.status(400).json(ResponseObj(false, 'downPayment must be less than totalPrice'));
        }

        const result = calculateInstallmentPlan(
            Number(totalPrice),
            Number(downPayment),
            months,
            interestRate !== undefined ? Number(interestRate) : 0
        );

        res.status(200).json(ResponseObj(true, 'Installment plan calculated', result));
    } catch (err) {
        console.error('toolsController.installmentCalculator:', err);
        res.status(500).json(ResponseObj(false, 'Failed to calculate installment plan', null, err.message));
    }
}

module.exports = { installmentCalculator };
