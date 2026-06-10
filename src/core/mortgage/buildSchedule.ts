import { calculateAnnuity } from './calculateAnnuity';
import { calculateDifferentiated } from './calculateDifferentiated';
import { applyPrepayments } from './applyPrepayments';
import { expandInsuranceSchedule } from './insuranceSchedule';
import { expandPrepaymentRules } from './prepaymentRules';
import type { CalculationResult, InsuranceEvent, MortgageInput, PaymentRow, PrepaymentEvent } from './types';

function addMonths(isoDate: string, months: number): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  date.setMonth(date.getMonth() + months);
  return date.toISOString().slice(0, 10);
}

function monthKey(isoDate: string): string { return isoDate.slice(0, 7); }

function groupPrepayments(prepayments: PrepaymentEvent[]): Map<string, PrepaymentEvent[]> {
  const map = new Map<string, PrepaymentEvent[]>();
  prepayments.forEach((p) => {
    if (!Number.isFinite(p.amount) || p.amount <= 0) return;
    const key = monthKey(p.date);
    map.set(key, [...(map.get(key) ?? []), p]);
  });
  return map;
}

export function buildSchedule(input: MortgageInput, includePrepayments: boolean): CalculationResult | null {
  const termMonths = Math.floor(input.termYears * 12);
  const monthlyRate = input.annualRate / 12 / 100;
  const firstDate = new Date(input.firstPaymentDate);

  if (termMonths <= 0 || input.loanAmount <= 0 || input.annualRate <= 0 || Number.isNaN(firstDate.getTime())) return null;

  const expandedPrepayments = includePrepayments ? expandPrepaymentRules(input.prepayments, input) : [];
  const prepaymentMap = groupPrepayments(expandedPrepayments);
  let remainingDebt = Number(input.loanAmount.toFixed(2));
  let termLeft = termMonths;
  let month = 0;
  let annuityPayment = input.paymentType === 'annuity' ? calculateAnnuity(input.loanAmount, input.annualRate, termMonths) : 0;
  let differentiatedPrincipal = input.paymentType === 'differentiated' ? Number((input.loanAmount / termMonths).toFixed(2)) : 0;
  const schedule: PaymentRow[] = [];

  while (remainingDebt > 0.01 && month < termMonths + 600 && termLeft > 0) {
    const date = addMonths(input.firstPaymentDate, month);
    const interest = Number((remainingDebt * monthlyRate).toFixed(2));
    let payment = input.paymentType === 'annuity'
      ? annuityPayment
      : Number((Math.min(remainingDebt, differentiatedPrincipal) + interest).toFixed(2));

    // Keep legacy helper as a guard for the first differentiated row, but make
    // later rows depend on the actual remaining debt after prepayments.
    if (input.paymentType === 'differentiated' && month === 0) {
      payment = calculateDifferentiated(input.loanAmount, input.annualRate, termMonths, month);
    }

    if (!Number.isFinite(payment) || payment <= 0) return null;

    let principal = Number((payment - interest).toFixed(2));
    if (principal <= 0) return null;
    if (termLeft <= 1 && principal < remainingDebt) {
      principal = remainingDebt;
      payment = Number((principal + interest).toFixed(2));
    }
    if (principal > remainingDebt) {
      principal = remainingDebt;
      payment = Number((principal + interest).toFixed(2));
    }

    remainingDebt = Number((remainingDebt - principal).toFixed(2));
    const termAfterRegularPayment = Math.max(0, termLeft - 1);

    const { prepaymentAmount, events, adjustment } = applyPrepayments(
      prepaymentMap,
      monthKey(date),
      remainingDebt,
      input.paymentType === 'annuity' ? annuityPayment : differentiatedPrincipal,
      input.paymentType === 'annuity' ? monthlyRate : 0,
      termAfterRegularPayment,
    );
    remainingDebt = Number(adjustment.remainingDebt.toFixed(2));

    if (input.paymentType === 'annuity') {
      annuityPayment = adjustment.monthlyPayment;
      termLeft = remainingDebt <= 0 ? 0 : Math.max(1, adjustment.termMonthsLeft);
    } else {
      differentiatedPrincipal = adjustment.monthlyPayment > 0 ? Number(adjustment.monthlyPayment.toFixed(2)) : differentiatedPrincipal;
      termLeft = remainingDebt <= 0 ? 0 : Math.max(1, adjustment.termMonthsLeft);
    }

    schedule.push({
      monthIndex: month + 1,
      date,
      payment,
      interest,
      principal,
      prepayment: prepaymentAmount,
      prepaymentEvents: events,
      insuranceCost: 0,
      insuranceEvents: [],
      realPaid: Number((payment + prepaymentAmount).toFixed(2)),
      remainingDebt: Math.max(0, remainingDebt),
    });

    month += 1;
  }

  if (!schedule.length) return null;

  const totalInterest = Number(schedule.reduce((sum, row) => sum + row.interest, 0).toFixed(2));
  const totalPayment = Number(schedule.reduce((sum, row) => sum + row.payment + row.prepayment, 0).toFixed(2));
  const closingDate = schedule.at(-1)?.date ?? input.firstPaymentDate;
  const insuranceEvents = expandInsuranceSchedule(input.insuranceRules ?? [], closingDate);
  const insuranceByMonth = new Map<string, InsuranceEvent[]>();
  insuranceEvents.forEach((event) => insuranceByMonth.set(monthKey(event.date), [...(insuranceByMonth.get(monthKey(event.date)) ?? []), event]));
  schedule.forEach((row) => {
    const rowEvents = insuranceByMonth.get(monthKey(row.date)) ?? [];
    row.insuranceEvents = rowEvents;
    row.insuranceCost = Number(rowEvents.reduce((sum, event) => sum + event.amount, 0).toFixed(2));
    row.realPaid = Number((row.payment + row.prepayment + row.insuranceCost).toFixed(2));
  });
  const totalInsuranceCost = Number(insuranceEvents.reduce((sum, event) => sum + event.amount, 0).toFixed(2));
  const totalRealCost = Number((totalPayment + totalInsuranceCost).toFixed(2));
  const realCostMultiplier = input.propertyPrice > 0 ? Number((totalRealCost / input.propertyPrice).toFixed(4)) : 0;

  return {
    schedule,
    summary: { totalInterest, totalPayment, closingDate, totalInsuranceCost, totalRealCost, realCostMultiplier, insuranceEvents },
    monthlyPayment: input.paymentType === 'annuity' ? calculateAnnuity(input.loanAmount, input.annualRate, termMonths) : undefined,
  };
}
