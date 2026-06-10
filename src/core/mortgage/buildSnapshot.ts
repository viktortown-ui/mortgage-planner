import { compareScenarios } from './compareScenarios';
import type { MortgageCurrentSnapshot, MortgageFullPlan, MortgageInput, MortgageSnapshot, PaymentRow } from './types';

function isoToday(date = new Date()): string { return date.toISOString().slice(0, 10); }
function sumRows(rows: PaymentRow[], selector: (row: PaymentRow) => number): number {
  return Number(rows.reduce((sum, row) => sum + selector(row), 0).toFixed(2));
}

export function buildSnapshot(input: MortgageInput, asOf: Date = new Date()): MortgageSnapshot | null {
  const comparison = compareScenarios(input);
  if (!comparison) return null;

  const active = comparison.withPrepayments;
  const asOfDate = isoToday(asOf);
  const paidRows = active.schedule.filter((row) => row.date <= asOfDate);
  const futureRows = active.schedule.filter((row) => row.date > asOfDate);
  const lastPaidRow = paidRows.at(-1);
  const currentDebt = lastPaidRow?.remainingDebt ?? active.schedule[0]?.remainingDebt ?? input.loanAmount;
  const fullPlan: MortgageFullPlan = {
    totalPayment: active.summary.totalPayment,
    totalInterest: active.summary.totalInterest,
    totalInsuranceCost: active.summary.totalInsuranceCost,
    totalRealCost: active.summary.totalRealCost,
    realCostMultiplier: active.summary.realCostMultiplier,
    closingDate: active.summary.closingDate,
    monthsTotal: active.schedule.length,
    interestSavings: comparison.interestSavings,
    monthsSaved: comparison.monthsSaved,
  };

  const currentSnapshot: MortgageCurrentSnapshot = {
    asOfDate,
    elapsedMonths: paidRows.length,
    paidTotal: sumRows(paidRows, (row) => row.payment + row.prepayment + row.insuranceCost),
    paidInterest: sumRows(paidRows, (row) => row.interest),
    paidPrincipal: sumRows(paidRows, (row) => row.principal),
    paidPrepayments: sumRows(paidRows, (row) => row.prepayment),
    paidInsurance: sumRows(paidRows, (row) => row.insuranceCost),
    currentDebt: Number(Math.max(0, currentDebt).toFixed(2)),
    remainingToPay: sumRows(futureRows, (row) => row.payment + row.prepayment + row.insuranceCost),
    remainingInterest: sumRows(futureRows, (row) => row.interest),
    remainingInsurance: sumRows(futureRows, (row) => row.insuranceCost),
    progressPercent: active.schedule.length > 0 ? Number(((paidRows.length / active.schedule.length) * 100).toFixed(1)) : 0,
  };

  return {
    fullPlan,
    currentSnapshot,
    scenarioSummary: {
      baseline: comparison.baseline.summary,
      active: active.summary,
      interestSavings: comparison.interestSavings,
      monthsSaved: comparison.monthsSaved,
      hasPrepaymentEffect: comparison.interestSavings > 0 || comparison.monthsSaved > 0,
    },
    calendarEvents: active.schedule,
    chartsData: active.schedule,
    tableData: active.schedule,
    comparison,
  };
}
