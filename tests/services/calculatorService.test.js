const { calculateInstallmentPlan } = require('../../src/services/calculatorService');

describe('calculatorService', () => {
  describe('calculateInstallmentPlan', () => {
    test('zero interest: 1,000,000 over 12 months = 83,333.33/month', () => {
      const result = calculateInstallmentPlan(1000000, 0, 12, 0);

      expect(result.principal).toBe(1000000);
      expect(result.months).toBe(12);
      expect(result.monthlyPayment).toBeCloseTo(83333.33, 1);
      expect(result.totalPayable).toBeCloseTo(1000000, 0);
      expect(result.breakdown).toHaveLength(12);
      expect(result.breakdown[0].month).toBe(1);
      expect(result.breakdown[0].principal).toBeCloseTo(83333.33, 1);
      expect(result.breakdown[0].interest).toBe(0);
      expect(result.breakdown[0].remainingBalance).toBeGreaterThan(0);
      expect(result.breakdown[11].remainingBalance).toBeCloseTo(0, 0);
    });

    test('with down payment: 2,000,000 price, 500,000 down, 12 months, 0%', () => {
      const result = calculateInstallmentPlan(2000000, 500000, 12, 0);

      expect(result.principal).toBe(1500000);
      expect(result.downPayment).toBe(500000);
      expect(result.monthlyPayment).toBeCloseTo(125000, 0);
      expect(result.totalPayable).toBeCloseTo(1500000, 0);
    });

    test('with interest: 100,000 over 6 months at 12% annual', () => {
      const result = calculateInstallmentPlan(100000, 0, 6, 12);

      expect(result.interestRate).toBe(12);
      expect(result.monthlyPayment).toBeGreaterThan(100000 / 6);
      expect(result.totalPayable).toBeGreaterThan(100000);
      expect(result.breakdown).toHaveLength(6);
      expect(result.breakdown[0].interest).toBeGreaterThan(0);
      const totalFromBreakdown = result.breakdown.reduce((sum, row) => sum + row.principal + row.interest, 0);
      expect(totalFromBreakdown).toBeCloseTo(result.totalPayable, 0);
    });

    test('single month: full principal paid immediately', () => {
      const result = calculateInstallmentPlan(50000, 0, 1, 0);

      expect(result.monthlyPayment).toBe(50000);
      expect(result.breakdown).toHaveLength(1);
      expect(result.breakdown[0].remainingBalance).toBe(0);
    });

    test('returns all required top-level fields', () => {
      const result = calculateInstallmentPlan(100000, 10000, 12, 5);

      expect(result).toHaveProperty('totalPrice');
      expect(result).toHaveProperty('downPayment');
      expect(result).toHaveProperty('principal');
      expect(result).toHaveProperty('months');
      expect(result).toHaveProperty('interestRate');
      expect(result).toHaveProperty('monthlyPayment');
      expect(result).toHaveProperty('totalPayable');
      expect(result).toHaveProperty('breakdown');
    });
  });
});
