function calculateInstallmentPlan(totalPrice, downPayment, months, interestRate) {
    const principal = totalPrice - downPayment;
    const ratePerMonth = (interestRate || 0) / 100 / 12;
    let monthlyPayment;
    let breakdown;

    if (ratePerMonth === 0) {
        monthlyPayment = principal / months;
        breakdown = [];
        let remaining = principal;
        for (let i = 1; i <= months; i++) {
            remaining -= monthlyPayment;
            breakdown.push({
                month: i,
                principal: Math.round(monthlyPayment * 100) / 100,
                interest: 0,
                remainingBalance: Math.round(Math.max(remaining, 0) * 100) / 100,
            });
        }
    } else {
        monthlyPayment = principal * (ratePerMonth * Math.pow(1 + ratePerMonth, months)) / (Math.pow(1 + ratePerMonth, months) - 1);
        breakdown = [];
        let remaining = principal;
        for (let i = 1; i <= months; i++) {
            const interest = remaining * ratePerMonth;
            const principalPart = monthlyPayment - interest;
            remaining -= principalPart;
            breakdown.push({
                month: i,
                principal: Math.round(principalPart * 100) / 100,
                interest: Math.round(interest * 100) / 100,
                remainingBalance: Math.round(Math.max(remaining, 0) * 100) / 100,
            });
        }
    }

    return {
        totalPrice,
        downPayment,
        principal: Math.round(principal * 100) / 100,
        months,
        interestRate: interestRate || 0,
        monthlyPayment: Math.round(monthlyPayment * 100) / 100,
        totalPayable: Math.round(monthlyPayment * months * 100) / 100,
        breakdown,
    };
}

module.exports = { calculateInstallmentPlan };
