import { describe, expect, it } from 'vitest';
import { applyPrepayments } from '../applyPrepayments';
import { buildSnapshot } from '../buildSnapshot';
import { calculateAnnuity } from '../calculateAnnuity';
import { calculateDifferentiated } from '../calculateDifferentiated';
import { compareScenarios } from '../compareScenarios';
import { expandInsuranceSchedule } from '../insuranceSchedule';
import { buildSchedule } from '../buildSchedule';
import type { MortgageInput, PrepaymentEvent } from '../types';

const baseInput: MortgageInput = {
  propertyPrice: 5_000_000,
  downPayment: 1_000_000,
  loanAmount: 4_000_000,
  annualRate: 10,
  termYears: 10,
  firstPaymentDate: '2023-01-01',
  paymentType: 'annuity',
  prepayments: [],
  insuranceRules: [],
  incomeMonthly: 180_000,
};

describe('mortgage core formulas', () => {
  it('calculateAnnuity returns the stable payment for a base loan', () => {
    expect(calculateAnnuity(1_000_000, 12, 12)).toBe(88_848.79);
  });

  it('calculateDifferentiated returns a decreasing first-row payment basis', () => {
    expect(calculateDifferentiated(1_200_000, 12, 12, 0)).toBe(112_000);
    expect(calculateDifferentiated(1_200_000, 12, 12, 1)).toBe(111_000);
  });

  it('applyPrepayments clamps a prepayment larger than remaining debt', () => {
    const map = new Map<string, PrepaymentEvent[]>([['2023-02', [{ date: '2023-02-10', amount: 2_000_000, mode: 'reduceTerm' }]]]);
    const applied = applyPrepayments(map, '2023-02', 500_000, 30_000, 0.01, 100);
    expect(applied.prepaymentAmount).toBe(500_000);
    expect(applied.adjustment.remainingDebt).toBe(0);
  });
});

describe('schedule, insurance and snapshot consistency', () => {
  it('builds a baseline schedule without prepayments', () => {
    const result = buildSchedule(baseInput, true);
    expect(result?.schedule).toHaveLength(120);
    expect(result?.summary.totalInterest).toBeGreaterThan(0);
    expect(result?.summary.totalPayment).toBeCloseTo((result?.summary.totalInterest ?? 0) + baseInput.loanAmount, 0);
  });

  it('applies a one-time prepayment and reports savings consistently', () => {
    const comparison = compareScenarios({ ...baseInput, prepayments: [{ date: '2024-01-01', amount: 500_000, mode: 'reduceTerm' }] });
    expect(comparison?.interestSavings).toBeGreaterThan(0);
    expect(comparison?.monthsSaved).toBeGreaterThan(0);
  });

  it('expands regular monthly prepayments and annual insurance separately from principal debt', () => {
    const input: MortgageInput = {
      ...baseInput,
      prepayments: [{ kind: 'regular', date: '2023-02-01', amount: 10_000, mode: 'reducePayment', frequency: 'monthly', repeatCount: 12 }],
      insuranceRules: [{ id: 'i1', title: 'Полис', type: 'propertyInsurance', amount: 25_000, startDate: '2023-01-01', frequency: 'annual', enabled: true }],
    };
    const result = buildSchedule(input, true);
    expect(result?.schedule.some((row) => row.prepayment > 0)).toBe(true);
    expect(result?.summary.totalInsuranceCost).toBeGreaterThan(0);
    expect(result?.summary.totalPayment).not.toBe(result?.summary.totalRealCost);
  });

  it('expands insurance through closing date', () => {
    const events = expandInsuranceSchedule([{ id: 'life', title: 'Жизнь', type: 'lifeInsurance', amount: 1_000, startDate: '2023-01-01', frequency: 'monthly', enabled: true }], '2023-03-01');
    expect(events.map((event) => event.date)).toEqual(['2023-01-01', '2023-02-01', '2023-03-01']);
  });

  it('buildSnapshot separates lifetime, current and scenario layers', () => {
    const snapshot = buildSnapshot({ ...baseInput, prepayments: [{ date: '2023-06-01', amount: 200_000, mode: 'reduceTerm' }] }, new Date('2025-01-15T00:00:00Z'));
    expect(snapshot?.fullPlan.totalRealCost).toBe(snapshot?.scenarioSummary.active.totalRealCost);
    expect(snapshot?.currentSnapshot.elapsedMonths).toBeGreaterThan(0);
    expect(snapshot?.currentSnapshot.paidInterest).toBeGreaterThan(0);
    expect(snapshot?.tableData).toBe(snapshot?.chartsData);
  });

  it('compares a mixed scenario with differentiated payments', () => {
    const comparison = compareScenarios({
      ...baseInput,
      paymentType: 'differentiated',
      prepayments: [
        { date: '2024-01-01', amount: 300_000, mode: 'reduceTerm' },
        { kind: 'regular', date: '2025-01-01', amount: 50_000, mode: 'reducePayment', frequency: 'annual', repeatCount: 3 },
      ],
      insuranceRules: [{ id: 'title', title: 'Титул', type: 'titleInsurance', amount: 15_000, startDate: '2023-01-01', frequency: 'annual', enabled: true }],
    });
    expect(comparison?.withPrepayments.schedule.at(-1)?.remainingDebt).toBe(0);
    expect(comparison?.withPrepayments.summary.totalInsuranceCost).toBeGreaterThan(0);
  });
});
