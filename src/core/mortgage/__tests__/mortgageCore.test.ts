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
    expect(snapshot?.currentSnapshot.remainingPrincipal).toBe(snapshot?.currentSnapshot.currentDebt);
    expect(snapshot?.currentSnapshot.futureInterestRemaining).toBe(snapshot?.currentSnapshot.remainingInterest);
    expect(snapshot?.currentSnapshot.futureInsuranceRemaining).toBe(snapshot?.currentSnapshot.remainingInsurance);
    expect(snapshot?.currentSnapshot.remainingTotalCashflow).toBeCloseTo(
      (snapshot?.currentSnapshot.remainingPrincipal ?? 0) +
        (snapshot?.currentSnapshot.futureInterestRemaining ?? 0) +
        (snapshot?.currentSnapshot.futureInsuranceRemaining ?? 0),
      2,
    );
    expect(snapshot?.currentSnapshot.paidInterestToDate).toBe(snapshot?.currentSnapshot.paidInterest);
    expect(snapshot?.currentSnapshot.paidPrincipalToDate).toBe(snapshot?.currentSnapshot.paidPrincipal);
    expect(snapshot?.fullPlan.totalInterestFullPlan).toBe(snapshot?.fullPlan.totalInterest);
    expect(snapshot?.fullPlan.interestSavedByPrepayments).toBe(snapshot?.comparison.interestSavedByPrepayments);
    expect(snapshot?.tableData).toBe(snapshot?.chartsData);
  });

  it('keeps the full principal before the first scheduled payment', () => {
    const futureInput = { ...baseInput, firstPaymentDate: '2030-01-01' };
    const snapshot = buildSnapshot(futureInput, new Date('2029-12-01T00:00:00Z'));

    expect(snapshot?.currentSnapshot.elapsedMonths).toBe(0);
    expect(snapshot?.currentSnapshot.currentDebt).toBe(futureInput.loanAmount);
    expect(snapshot?.currentSnapshot.remainingTotalCashflow).toBeCloseTo(
      futureInput.loanAmount + (snapshot?.fullPlan.totalInterest ?? 0),
      2,
    );
  });



  it('keeps the June 2026 sample case readable as principal, future interest and savings', () => {
    const sample: MortgageInput = {
      propertyPrice: 2_300_000,
      downPayment: 580_000,
      loanAmount: 1_720_000,
      annualRate: 10.9,
      termYears: 20,
      firstPaymentDate: '2023-09-11',
      paymentType: 'annuity',
      incomeMonthly: 95_000,
      prepayments: [
        { date: '2024-10-11', amount: 210_000, mode: 'reduceTerm' },
        { date: '2025-02-11', amount: 100_000, mode: 'reduceTerm' },
        { date: '2025-06-11', amount: 305_000, mode: 'reduceTerm' },
      ],
      insuranceRules: [{ id: 'annual-insurance', title: 'Страховка', type: 'propertyInsurance', amount: 4_000, startDate: '2023-09-11', frequency: 'annual', enabled: true }],
    };

    const snapshot = buildSnapshot(sample, new Date('2026-06-11T00:00:00Z'));
    expect(snapshot?.currentSnapshot.remainingPrincipal).toBeGreaterThan(900_000);
    expect(snapshot?.currentSnapshot.remainingPrincipal).toBeLessThan(970_000);
    expect(snapshot?.currentSnapshot.futureInterestRemaining).toBeGreaterThan(0);
    expect(snapshot?.currentSnapshot.paidInterestToDate).toBeGreaterThan(0);
    expect(snapshot?.fullPlan.interestSavedByPrepayments).toBeGreaterThan(0);
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

describe('strategy start modes', () => {
  const sample: MortgageInput = {
    propertyPrice: 2_300_000,
    downPayment: 580_000,
    loanAmount: 1_720_000,
    annualRate: 10.9,
    termYears: 20,
    firstPaymentDate: '2023-09-11',
    paymentType: 'annuity',
    incomeMonthly: 95_000,
    prepayments: [
      { date: '2024-10-11', amount: 210_000, mode: 'reduceTerm' },
      { date: '2025-02-11', amount: 100_000, mode: 'reduceTerm' },
      { date: '2025-06-11', amount: 305_000, mode: 'reduceTerm' },
    ],
    insuranceRules: [{ id: 'annual-insurance', title: 'Страховка', type: 'propertyInsurance', amount: 4_000, startDate: '2023-09-11', frequency: 'annual', enabled: true }],
  };

  const scenario = { id: 'A' as const, amount: 20_000, frequency: 'monthly' as const, mode: 'reduceTerm' as const };
  const asOf = new Date('2026-06-11T00:00:00Z');

  it('calculates strategy from start against the full baseline schedule', async () => {
    const { compareSmartScenario, resolveStrategyStartPoint } = await import('../strategyStart');
    const startPoint = resolveStrategyStartPoint(sample, { mode: 'loanStart' }, asOf);
    expect(startPoint?.remainingPrincipal).toBe(sample.loanAmount);
    expect(startPoint?.elapsedPayments).toBe(0);
    const result = startPoint ? compareSmartScenario(sample, scenario, startPoint).result : null;
    expect(result?.baseline.schedule[0]?.date).toBe('2023-09-11');
    expect(result?.baseline.schedule.length).toBe(240);
    expect(result?.interestSavings).toBeGreaterThan(0);
  });

  it('calculates strategy from current snapshot remaining principal', async () => {
    const { compareSmartScenario, resolveStrategyStartPoint } = await import('../strategyStart');
    const startPoint = resolveStrategyStartPoint(sample, { mode: 'currentSnapshot' }, asOf);
    expect(startPoint?.strategyDate).toBe('2026-06-11');
    expect(startPoint?.remainingPrincipal).toBeGreaterThan(900_000);
    expect(startPoint?.remainingPrincipal).toBeLessThan(970_000);
    expect(startPoint?.elapsedPayments).toBeGreaterThan(0);
    const result = startPoint ? compareSmartScenario(sample, scenario, startPoint).result : null;
    expect(result?.baseline.schedule[0]?.date).toBe('2026-07-11');
    expect(result?.baseline.schedule[0]?.remainingDebt).toBeLessThan(sample.loanAmount);
    expect(result?.interestSavings).toBeGreaterThan(0);
  });

  it('calculates strategy from a custom future date', async () => {
    const { compareSmartScenario, resolveStrategyStartPoint } = await import('../strategyStart');
    const startPoint = resolveStrategyStartPoint(sample, { mode: 'customDate', customDate: '2026-12-11' }, asOf);
    expect(startPoint?.strategyDate).toBe('2026-12-11');
    expect(startPoint?.warningMessages).toEqual([]);
    const result = startPoint ? compareSmartScenario(sample, scenario, startPoint).result : null;
    expect(result?.baseline.schedule[0]?.date).toBe('2027-01-11');
    expect(result?.interestSavings).toBeGreaterThan(0);
  });

  it('warns when custom date is before the current date', async () => {
    const { compareSmartScenario, resolveStrategyStartPoint } = await import('../strategyStart');
    const startPoint = resolveStrategyStartPoint(sample, { mode: 'customDate', customDate: '2026-01-11' }, asOf);
    expect(startPoint?.warningMessages).toContain('Дата стратегии уже прошла. Выберите дату в будущем или используйте режим с начала кредита.');
    const result = startPoint ? compareSmartScenario(sample, scenario, startPoint).result : null;
    expect(result).toBeNull();
  });

  it('warns when custom date is after the closing date', async () => {
    const { compareSmartScenario, resolveStrategyStartPoint } = await import('../strategyStart');
    const startPoint = resolveStrategyStartPoint(sample, { mode: 'customDate', customDate: '2045-01-11' }, asOf);
    expect(startPoint?.warningMessages).toContain('Дата стратегии позже закрытия кредита.');
    const result = startPoint ? compareSmartScenario(sample, scenario, startPoint).result : null;
    expect(result).toBeNull();
  });
});

describe('smart scenario payment relief metrics', () => {
  const sample: MortgageInput = {
    propertyPrice: 2_300_000,
    downPayment: 580_000,
    loanAmount: 1_720_000,
    annualRate: 10.9,
    termYears: 20,
    firstPaymentDate: '2023-09-11',
    paymentType: 'annuity',
    incomeMonthly: 95_000,
    prepayments: [
      { date: '2024-10-11', amount: 210_000, mode: 'reduceTerm' },
      { date: '2025-02-11', amount: 100_000, mode: 'reduceTerm' },
      { date: '2025-06-11', amount: 305_000, mode: 'reduceTerm' },
    ],
    insuranceRules: [],
  };
  const asOf = new Date('2026-06-11T00:00:00Z');

  it('keeps reduceTerm focused on interest saving and term reduction', async () => {
    const { compareSmartScenario, resolveStrategyStartPoint } = await import('../strategyStart');
    const startPoint = resolveStrategyStartPoint(sample, { mode: 'currentSnapshot' }, asOf);
    const result = startPoint ? compareSmartScenario(sample, { id: 'A', amount: 100_000, frequency: 'semiAnnual', mode: 'reduceTerm' }, startPoint).result : null;
    expect(result?.interestSavings).toBeGreaterThan(0);
    expect(result?.monthsSaved).toBeGreaterThan(0);
    expect(result?.paymentMetrics?.monthlyPaymentReduction).toBe(0);
  });

  it('calculates reducePayment monthly payment and income load decrease', async () => {
    const { compareSmartScenario, resolveStrategyStartPoint } = await import('../strategyStart');
    const startPoint = resolveStrategyStartPoint(sample, { mode: 'currentSnapshot' }, asOf);
    const result = startPoint ? compareSmartScenario(sample, { id: 'B', amount: 100_000, frequency: 'semiAnnual', mode: 'reducePayment' }, startPoint).result : null;
    expect(result?.paymentMetrics?.baselineMonthlyPayment).toBeGreaterThan(result?.paymentMetrics?.firstPaymentAfterStrategy ?? 0);
    expect(result?.paymentMetrics?.monthlyPaymentReduction).toBeGreaterThan(0);
    expect(result?.paymentMetrics?.incomeLoadBefore).toBeGreaterThan(result?.paymentMetrics?.incomeLoadAfter ?? 0);
    expect(result?.paymentMetrics?.annualFreedCashflow).toBeCloseTo((result?.paymentMetrics?.monthlyPaymentReduction ?? 0) * 12, 2);
  });

  it('allows payment objective to pick reducePayment while interest objective picks reduceTerm', async () => {
    const { compareSmartScenario, resolveStrategyStartPoint } = await import('../strategyStart');
    const startPoint = resolveStrategyStartPoint(sample, { mode: 'currentSnapshot' }, asOf);
    const scenarios = [
      { id: 'A' as const, amount: 100_000, frequency: 'semiAnnual' as const, mode: 'reduceTerm' as const },
      { id: 'B' as const, amount: 100_000, frequency: 'semiAnnual' as const, mode: 'reducePayment' as const },
      { id: 'C' as const, amount: 50_000, frequency: 'quarterly' as const, mode: 'reducePayment' as const },
    ];
    const results = startPoint ? scenarios.map((scenario) => compareSmartScenario(sample, scenario, startPoint)) : [];
    const bestInterest = results.toSorted((a, b) => (b.result?.interestSavings ?? 0) - (a.result?.interestSavings ?? 0))[0];
    const bestPayment = results.toSorted((a, b) => (b.result?.paymentMetrics?.monthlyPaymentReduction ?? 0) - (a.result?.paymentMetrics?.monthlyPaymentReduction ?? 0))[0];
    expect(bestInterest.id).toBe('A');
    expect(bestPayment.result ? scenarios.find((scenario) => scenario.id === bestPayment.id)?.mode : undefined).toBe('reducePayment');
  });

  it('current moment strategy compares against future baseline, not the full original loan', async () => {
    const { compareSmartScenario, resolveStrategyStartPoint } = await import('../strategyStart');
    const startPoint = resolveStrategyStartPoint(sample, { mode: 'currentSnapshot' }, asOf);
    const result = startPoint ? compareSmartScenario(sample, { id: 'C', amount: 50_000, frequency: 'quarterly', mode: 'reducePayment' }, startPoint).result : null;
    expect(result?.baseline.schedule[0]?.date).toBe('2026-07-11');
    expect(result?.baseline.schedule.length).toBe(startPoint?.baselineFutureMonths);
    expect(result?.baseline.schedule[0]?.remainingDebt).toBeLessThan(sample.loanAmount);
  });
});

describe('overview reducePayment impact', () => {
  it('shows already applied reducePayment as current payment relief', () => {
    const input: MortgageInput = {
      ...baseInput,
      firstPaymentDate: '2025-01-12',
      prepayments: [{ date: '2025-06-12', amount: 200_000, mode: 'reducePayment' }],
    };
    const snapshot = buildSnapshot(input, new Date('2026-01-12T00:00:00Z'));
    expect(snapshot?.scenarioSummary.reducePaymentImpact.alreadyApplied).toBe(true);
    expect(snapshot?.currentSnapshot.monthlyPaymentReduction).toBeGreaterThan(0);
    expect(snapshot?.currentSnapshot.currentScheduledPayment).toBeLessThan(snapshot?.currentSnapshot.originalMonthlyPayment ?? 0);
  });

  it('shows future reducePayment without changing current scheduled payment immediately', () => {
    const input: MortgageInput = {
      ...baseInput,
      firstPaymentDate: '2025-01-12',
      prepayments: [{ date: '2026-06-12', amount: 200_000, mode: 'reducePayment' }],
    };
    const snapshot = buildSnapshot(input, new Date('2026-01-12T00:00:00Z'));
    expect(snapshot?.scenarioSummary.reducePaymentImpact.alreadyApplied).toBe(false);
    expect(snapshot?.scenarioSummary.reducePaymentImpact.monthlyPaymentReduction).toBeGreaterThan(0);
    expect(snapshot?.currentSnapshot.currentScheduledPayment).toBeCloseTo(snapshot?.currentSnapshot.originalMonthlyPayment ?? 0, 0);
  });
});
