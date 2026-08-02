import { buildSchedule } from './buildSchedule';
import { buildSnapshot } from './buildSnapshot';
import { expandInsuranceSchedule } from './insuranceSchedule';
import type { CalculationResult, ComparisonResult, InsuranceRule, MortgageInput, MortgageSnapshot, PaymentRow, PrepaymentMode, StrategyPaymentMetrics } from './types';

export type StrategyStartMode = 'loanStart' | 'currentSnapshot' | 'customDate';
export type ScenarioFrequency = 'monthly' | 'quarterly' | 'semiAnnual' | 'annual';

export interface StrategyStartSettings {
  mode: StrategyStartMode;
  customDate?: string;
}

export interface SmartScenarioInput {
  id: 'A' | 'B' | 'C';
  amount: number;
  frequency: ScenarioFrequency;
  mode: PrepaymentMode;
  startDate?: string;
  durationMonths?: number;
}

export interface StrategyStartPoint {
  mode: StrategyStartMode;
  strategyDate: string;
  scheduleStartDate: string;
  remainingPrincipal: number;
  elapsedPayments: number;
  paidInterest: number;
  paidPrepayments: number;
  paidInsurance: number;
  baselineClosingDate: string;
  baselineFutureMonths: number;
  warningMessages: string[];
  blocksCalculation: boolean;
}

export interface SmartScenarioResult {
  id: 'A' | 'B' | 'C';
  result: ComparisonResult | null;
  warnings: string[];
}

function isoToday(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function addMonths(isoDate: string, months: number): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  date.setMonth(date.getMonth() + months);
  return date.toISOString().slice(0, 10);
}

function sumRows(rows: PaymentRow[], selector: (row: PaymentRow) => number): number {
  return Number(rows.reduce((sum, row) => sum + selector(row), 0).toFixed(2));
}

const stepByFrequency: Record<ScenarioFrequency, number> = {
  monthly: 1,
  quarterly: 3,
  semiAnnual: 6,
  annual: 12,
};

const frequencyStep: Record<InsuranceRule['frequency'], number | null> = {
  once: null,
  monthly: 1,
  quarterly: 3,
  semiAnnual: 6,
  annual: 12,
};

function firstInsuranceDateOnOrAfter(rule: InsuranceRule, date: string): string | null {
  if (rule.startDate >= date) return rule.startDate;
  const step = frequencyStep[rule.frequency];
  if (step === null) return null;
  let next = rule.startDate;
  for (let guard = 0; next < date && guard < 1200; guard += 1) {
    next = addMonths(next, step);
  }
  if (next < date) return null;
  if (rule.endDate && next > rule.endDate) return null;
  return next;
}

function shiftInsuranceRulesToStart(rules: InsuranceRule[], startDate: string): InsuranceRule[] {
  return rules.flatMap((rule) => {
    if (!rule.enabled) return [];
    const nextStart = firstInsuranceDateOnOrAfter(rule, startDate);
    if (!nextStart) return [];
    return [{ ...rule, startDate: nextStart }];
  });
}

function buildStrategyPrepayments(scenario: SmartScenarioInput, startDate: string, maxMonths: number): MortgageInput['prepayments'] {
  if (scenario.amount <= 0 || maxMonths <= 0) return [];
  const duration = scenario.durationMonths && scenario.durationMonths > 0 ? Math.min(maxMonths, scenario.durationMonths) : maxMonths;
  const step = stepByFrequency[scenario.frequency];
  const list: MortgageInput['prepayments'] = [];
  for (let month = 0; month < duration; month += step) {
    list.push({ date: addMonths(startDate, month), amount: scenario.amount, mode: scenario.mode });
  }
  return list;
}


function averagePayment(rows: PaymentRow[]): number {
  if (!rows.length) return 0;
  return Number((rows.reduce((sum, row) => sum + row.payment, 0) / rows.length).toFixed(2));
}

function incomeLoad(payment: number, income?: number): number | undefined {
  if (!income || income <= 0) return undefined;
  return Number((payment / income).toFixed(4));
}

function buildStrategyPaymentMetrics(
  baseline: CalculationResult,
  withPrepayments: CalculationResult,
  mode: PrepaymentMode,
  incomeMonthly: number | undefined,
  interestSavings: number,
  monthsSaved: number,
): StrategyPaymentMetrics {
  const baselineMonthlyPayment = baseline.schedule[0]?.payment ?? baseline.monthlyPayment ?? 0;
  const firstPrepayIndex = withPrepayments.schedule.findIndex((row) => row.prepaymentEvents?.some((event) => event.mode === mode));
  const firstPaymentAfterStrategy = firstPrepayIndex >= 0
    ? (withPrepayments.schedule[firstPrepayIndex + 1]?.payment ?? withPrepayments.schedule[firstPrepayIndex]?.payment ?? 0)
    : (withPrepayments.schedule[0]?.payment ?? 0);
  const averagePaymentNext12Months = averagePayment(withPrepayments.schedule.slice(0, 12));
  const averagePaymentRemaining = averagePayment(withPrepayments.schedule);
  const paymentAfterForRelief = mode === 'reducePayment' ? firstPaymentAfterStrategy : (withPrepayments.schedule[0]?.payment ?? baselineMonthlyPayment);
  const monthlyPaymentReduction = Number(Math.max(0, baselineMonthlyPayment - paymentAfterForRelief).toFixed(2));
  const monthlyPaymentReductionPercent = baselineMonthlyPayment > 0 ? Number(((monthlyPaymentReduction / baselineMonthlyPayment) * 100).toFixed(1)) : 0;
  const incomeLoadBefore = incomeLoad(baselineMonthlyPayment, incomeMonthly);
  const incomeLoadAfter = incomeLoad(Math.max(0, baselineMonthlyPayment - monthlyPaymentReduction), incomeMonthly);
  const annualFreedCashflow = Number((monthlyPaymentReduction * 12).toFixed(2));
  return {
    baselineMonthlyPayment,
    firstPaymentAfterStrategy,
    averagePaymentNext12Months,
    averagePaymentRemaining,
    monthlyPaymentReduction,
    monthlyPaymentReductionPercent,
    incomeLoadBefore,
    incomeLoadAfter,
    incomeLoadDelta: incomeLoadBefore !== undefined && incomeLoadAfter !== undefined ? Number((incomeLoadBefore - incomeLoadAfter).toFixed(4)) : undefined,
    annualFreedCashflow,
    lifeEffectLabel: mode === 'reduceTerm' ? 'Сильнее режет проценты и срок.' : 'Снижает ежемесячное давление, но экономит меньше процентов.',
    strategyObjectiveScores: {
      interestSavingScore: interestSavings,
      paymentReliefScore: monthlyPaymentReduction,
      balanceScore: interestSavings * 0.5 + monthlyPaymentReduction * 120 * 0.3 + Math.max(0, monthsSaved) * 1000 * 0.2,
    },
  };
}

function compareResults(baseline: CalculationResult, withPrepayments: CalculationResult, mode?: PrepaymentMode, incomeMonthly?: number): ComparisonResult {
  const interestSavings = Number((baseline.summary.totalInterest - withPrepayments.summary.totalInterest).toFixed(2));
  const monthsSaved = baseline.schedule.length - withPrepayments.schedule.length;
  return {
    baseline,
    withPrepayments,
    interestSavings,
    interestSavedByPrepayments: interestSavings,
    monthsSaved,
    paymentMetrics: mode ? buildStrategyPaymentMetrics(baseline, withPrepayments, mode, incomeMonthly, interestSavings, monthsSaved) : undefined,
  };
}

function makeFutureInput(input: MortgageInput, startDate: string, remainingPrincipal: number, futureMonths: number): MortgageInput {
  return {
    ...input,
    loanAmount: Number(remainingPrincipal.toFixed(2)),
    downPayment: 0,
    firstPaymentDate: startDate,
    termYears: Math.max(1, futureMonths) / 12,
    prepayments: [],
    insuranceRules: shiftInsuranceRulesToStart(input.insuranceRules ?? [], startDate),
  };
}

export function resolveStrategyStartPoint(
  input: MortgageInput,
  settings: StrategyStartSettings,
  asOf: Date = new Date(),
  snapshotOverride?: MortgageSnapshot | null,
): StrategyStartPoint | null {
  const snapshot = snapshotOverride === undefined ? buildSnapshot(input, asOf) : snapshotOverride;
  if (!snapshot) return null;

  const active = snapshot.comparison.withPrepayments;
  const currentDate = snapshot.currentSnapshot.asOfDate || isoToday(asOf);
  const requestedDate = settings.mode === 'loanStart'
    ? input.firstPaymentDate
    : settings.mode === 'customDate' && settings.customDate
      ? settings.customDate
      : currentDate;

  if (settings.mode === 'loanStart') {
    return {
      mode: settings.mode,
      strategyDate: input.firstPaymentDate,
      scheduleStartDate: input.firstPaymentDate,
      remainingPrincipal: input.loanAmount,
      elapsedPayments: 0,
      paidInterest: 0,
      paidPrepayments: 0,
      paidInsurance: 0,
      baselineClosingDate: snapshot.comparison.baseline.summary.closingDate,
      baselineFutureMonths: snapshot.comparison.baseline.schedule.length,
      warningMessages: [],
      blocksCalculation: false,
    };
  }

  const paidRows = active.schedule.filter((row) => row.date <= requestedDate);
  const futureRows = active.schedule.filter((row) => row.date > requestedDate);
  const lastPaidRow = paidRows.at(-1);
  const remainingPrincipal = Number(Math.max(0, lastPaidRow?.remainingDebt ?? input.loanAmount).toFixed(2));
  const scheduleStartDate = futureRows[0]?.date ?? addMonths(input.firstPaymentDate, paidRows.length);
  const warningMessages: string[] = [];

  if (settings.mode === 'customDate' && requestedDate < currentDate) {
    warningMessages.push('Дата стратегии уже прошла. Выберите дату в будущем или используйте режим с начала кредита.');
  }
  if (requestedDate > active.summary.closingDate) {
    warningMessages.push('Дата стратегии позже закрытия кредита.');
  }
  if (remainingPrincipal > 0 && remainingPrincipal < Math.max(10_000, input.loanAmount * 0.02)) {
    warningMessages.push('Остаток слишком мал, стратегия почти не влияет.');
  }

  return {
    mode: settings.mode,
    strategyDate: requestedDate,
    scheduleStartDate,
    remainingPrincipal,
    elapsedPayments: paidRows.length,
    paidInterest: sumRows(paidRows, (row) => row.interest),
    paidPrepayments: sumRows(paidRows, (row) => row.prepayment),
    paidInsurance: sumRows(paidRows, (row) => row.insuranceCost),
    baselineClosingDate: active.summary.closingDate,
    baselineFutureMonths: futureRows.length,
    warningMessages,
    blocksCalculation: requestedDate > active.summary.closingDate || (settings.mode === 'customDate' && requestedDate < currentDate),
  };
}

export function compareSmartScenario(
  input: MortgageInput,
  scenario: SmartScenarioInput,
  startPoint: StrategyStartPoint,
): SmartScenarioResult {
  const warnings = [...startPoint.warningMessages];
  if (scenario.amount <= 0) warnings.push('Введите сумму, чтобы увидеть эффект.');
  if (startPoint.blocksCalculation || scenario.amount <= 0) return { id: scenario.id, result: null, warnings };

  if (startPoint.mode === 'loanStart') {
    const baseline = buildSchedule({ ...input, prepayments: [] }, false);
    const prepayments = buildStrategyPrepayments(scenario, input.firstPaymentDate, input.termYears * 12);
    const withPrepayments = buildSchedule({ ...input, prepayments }, true);
    return { id: scenario.id, result: baseline && withPrepayments ? compareResults(baseline, withPrepayments, scenario.mode, input.incomeMonthly) : null, warnings };
  }

  if (startPoint.remainingPrincipal <= 0 || startPoint.baselineFutureMonths <= 0) {
    warnings.push('Дата стратегии позже закрытия кредита.');
    return { id: scenario.id, result: null, warnings };
  }

  const futureInput = makeFutureInput(input, startPoint.scheduleStartDate, startPoint.remainingPrincipal, startPoint.baselineFutureMonths);
  const baseline = buildSchedule(futureInput, false);
  const prepayments = buildStrategyPrepayments(scenario, startPoint.scheduleStartDate, startPoint.baselineFutureMonths);
  const withPrepayments = buildSchedule({ ...futureInput, prepayments }, true);
  return { id: scenario.id, result: baseline && withPrepayments ? compareResults(baseline, withPrepayments, scenario.mode, input.incomeMonthly) : null, warnings };
}

export function futureInsuranceEvents(input: MortgageInput, startDate: string, closingDate: string) {
  return expandInsuranceSchedule(shiftInsuranceRulesToStart(input.insuranceRules ?? [], startDate), closingDate);
}
