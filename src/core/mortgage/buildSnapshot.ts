import { compareScenarios } from './compareScenarios';
import type { ComparisonResult, MortgageCurrentSnapshot, MortgageFullPlan, MortgageInput, MortgageSnapshot, PaymentRow, ReducePaymentImpact } from './types';

function isoToday(date = new Date()): string { return date.toISOString().slice(0, 10); }
function sumRows(rows: PaymentRow[], selector: (row: PaymentRow) => number): number {
  return Number(rows.reduce((sum, row) => sum + selector(row), 0).toFixed(2));
}

function loadRatio(payment: number, income?: number): number | undefined {
  if (!income || income <= 0) return undefined;
  return Number((payment / income).toFixed(4));
}

function findReducePaymentImpact(input: MortgageInput, rows: PaymentRow[], asOfDate: string): ReducePaymentImpact {
  const reduceRows = rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => row.prepaymentEvents?.some((event) => event.mode === 'reducePayment'));
  if (!reduceRows.length) {
    return { hasReducePayment: false, alreadyApplied: false, paymentBefore: 0, paymentAfter: 0, monthlyPaymentReduction: 0, annualFreedCashflow: 0 };
  }

  const alreadyAppliedItems = reduceRows.filter(({ row }) => row.date <= asOfDate);
  const selected = alreadyAppliedItems.at(-1) ?? reduceRows[0];
  const afterRow = rows[selected.index + 1] ?? selected.row;
  const paymentBefore = selected.row.payment;
  const paymentAfter = afterRow.payment;
  const monthlyPaymentReduction = Number(Math.max(0, paymentBefore - paymentAfter).toFixed(2));
  const incomeLoadBefore = loadRatio(paymentBefore, input.incomeMonthly);
  const incomeLoadAfter = loadRatio(paymentAfter, input.incomeMonthly);
  return {
    hasReducePayment: true,
    alreadyApplied: selected.row.date <= asOfDate,
    nextReducePaymentDate: selected.row.date,
    paymentBefore,
    paymentAfter,
    monthlyPaymentReduction,
    annualFreedCashflow: Number((monthlyPaymentReduction * 12).toFixed(2)),
    incomeLoadBefore,
    incomeLoadAfter,
    incomeLoadDelta: incomeLoadBefore !== undefined && incomeLoadAfter !== undefined ? Number((incomeLoadBefore - incomeLoadAfter).toFixed(4)) : undefined,
  };
}

export function buildSnapshot(input: MortgageInput, asOf: Date = new Date(), comparisonOverride?: ComparisonResult): MortgageSnapshot | null {
  const comparison = comparisonOverride ?? compareScenarios(input);
  if (!comparison) return null;

  const active = comparison.withPrepayments;
  const asOfDate = isoToday(asOf);
  const paidRows = active.schedule.filter((row) => row.date <= asOfDate);
  const futureRows = active.schedule.filter((row) => row.date > asOfDate);
  const lastPaidRow = paidRows.at(-1);
  const currentDebt = lastPaidRow?.remainingDebt ?? input.loanAmount;
  const fullPlan: MortgageFullPlan = {
    totalPayment: active.summary.totalPayment,
    totalInterest: active.summary.totalInterest,
    totalInterestFullPlan: active.summary.totalInterest,
    totalInsuranceCost: active.summary.totalInsuranceCost,
    totalRealCost: active.summary.totalRealCost,
    realCostMultiplier: active.summary.realCostMultiplier,
    closingDate: active.summary.closingDate,
    monthsTotal: active.schedule.length,
    interestSavings: comparison.interestSavings,
    interestSavedByPrepayments: comparison.interestSavedByPrepayments,
    monthsSaved: comparison.monthsSaved,
  };

  const paidTotal = sumRows(paidRows, (row) => row.payment + row.prepayment + row.insuranceCost);
  const paidInterest = sumRows(paidRows, (row) => row.interest);
  const paidPrincipal = sumRows(paidRows, (row) => row.principal);
  const paidPrepayments = sumRows(paidRows, (row) => row.prepayment);
  const paidInsurance = sumRows(paidRows, (row) => row.insuranceCost);
  const remainingPrincipal = Number(Math.max(0, currentDebt).toFixed(2));
  const remainingInterest = sumRows(futureRows, (row) => row.interest);
  const remainingInsurance = sumRows(futureRows, (row) => row.insuranceCost);
  const remainingTotalCashflow = Number((remainingPrincipal + remainingInterest + remainingInsurance).toFixed(2));
  const reducePaymentImpact = findReducePaymentImpact(input, active.schedule, asOfDate);
  const nextScheduledPayment = futureRows[0]?.payment ?? 0;
  const currentScheduledPayment = nextScheduledPayment || lastPaidRow?.payment || active.monthlyPayment || 0;

  const currentSnapshot: MortgageCurrentSnapshot = {
    asOfDate,
    originalMonthlyPayment: comparison.baseline.monthlyPayment ?? comparison.baseline.schedule[0]?.payment ?? 0,
    currentScheduledPayment,
    nextScheduledPayment,
    paymentAfterNextReducePayment: reducePaymentImpact.hasReducePayment ? reducePaymentImpact.paymentAfter : undefined,
    monthlyPaymentReduction: reducePaymentImpact.monthlyPaymentReduction,
    annualFreedCashflow: reducePaymentImpact.annualFreedCashflow,
    elapsedMonths: paidRows.length,
    paidTotal,
    paidInterest,
    paidInterestToDate: paidInterest,
    paidPrincipal,
    paidPrincipalToDate: paidPrincipal,
    paidPrepayments,
    paidPrepaymentsToDate: paidPrepayments,
    paidInsurance,
    paidInsuranceToDate: paidInsurance,
    totalPaidToDate: paidTotal,
    currentDebt: remainingPrincipal,
    remainingPrincipal,
    remainingToPay: remainingTotalCashflow,
    remainingTotalCashflow,
    remainingInterest,
    futureInterestRemaining: remainingInterest,
    remainingInsurance,
    futureInsuranceRemaining: remainingInsurance,
    progressPercent: active.schedule.length > 0 ? Number(((paidRows.length / active.schedule.length) * 100).toFixed(1)) : 0,
  };

  return {
    fullPlan,
    currentSnapshot,
    scenarioSummary: {
      baseline: comparison.baseline.summary,
      active: active.summary,
      interestSavings: comparison.interestSavings,
      interestSavedByPrepayments: comparison.interestSavedByPrepayments,
      monthsSaved: comparison.monthsSaved,
      hasPrepaymentEffect: comparison.interestSavings > 0 || comparison.monthsSaved > 0,
      reducePaymentImpact,
    },
    calendarEvents: active.schedule,
    chartsData: active.schedule,
    tableData: active.schedule,
    comparison,
  };
}
