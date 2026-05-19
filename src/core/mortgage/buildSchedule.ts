import { calculateAnnuity } from './calculateAnnuity';
import { calculateDifferentiated } from './calculateDifferentiated';
import { applyPrepayments } from './applyPrepayments';
import type { CalculationResult, MortgageInput, PaymentRow, Prepayment } from './types';

function addMonths(isoDate: string, months: number): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }
  date.setMonth(date.getMonth() + months);
  return date.toISOString().slice(0, 10);
}

function groupPrepayments(prepayments: Prepayment[]): Map<string, Prepayment[]> {
  const map = new Map<string, Prepayment[]>();
  prepayments.forEach((p) => {
    if (!Number.isFinite(p.amount) || p.amount < 0) return;
    const list = map.get(p.date) ?? [];
    list.push(p);
    map.set(p.date, list);
  });
  return map;
}

export function buildSchedule(input: MortgageInput, includePrepayments: boolean): CalculationResult | null {
  const termMonths = Math.floor(input.termYears * 12);
  const monthlyRate = input.annualRate / 12 / 100;
  const firstDate = new Date(input.firstPaymentDate);

  if (termMonths <= 0 || input.loanAmount <= 0 || input.annualRate <= 0 || Number.isNaN(firstDate.getTime())) {
    return null;
  }

  const prepaymentMap = groupPrepayments(includePrepayments ? input.prepayments : []);
  let remainingDebt = input.loanAmount;
  let termLeft = termMonths;
  let month = 0;
  let monthlyPayment = input.paymentType === 'annuity' ? calculateAnnuity(input.loanAmount, input.annualRate, termMonths) : 0;
  const schedule: PaymentRow[] = [];

  while (remainingDebt > 0.01 && month < termMonths + 600) {
    const date = addMonths(input.firstPaymentDate, month);
    const interest = Number((remainingDebt * monthlyRate).toFixed(2));
    let payment = input.paymentType === 'annuity' ? monthlyPayment : calculateDifferentiated(input.loanAmount, input.annualRate, termMonths, month);

    if (!Number.isFinite(payment) || payment <= 0) return null;

    let principal = Number((payment - interest).toFixed(2));
    if (principal <= 0) return null;
    if (principal > remainingDebt) {
      principal = remainingDebt;
      payment = Number((principal + interest).toFixed(2));
    }

    remainingDebt = Number((remainingDebt - principal).toFixed(2));

    const { prepaymentAmount, adjustment } = applyPrepayments(prepaymentMap, date, remainingDebt, monthlyPayment, monthlyRate, termLeft);
    remainingDebt = adjustment.remainingDebt;
    if (input.paymentType === 'annuity') {
      monthlyPayment = adjustment.monthlyPayment;
      termLeft = adjustment.termMonthsLeft;
    }

    schedule.push({ monthIndex: month + 1, date, payment, interest, principal, prepayment: prepaymentAmount, remainingDebt: Math.max(0, remainingDebt) });

    month += 1;
    termLeft -= 1;
    if (termLeft <= 0 && remainingDebt > 0 && input.paymentType === 'annuity') {
      termLeft = 1;
    }
  }

  if (!schedule.length) return null;

  const totalInterest = Number(schedule.reduce((sum, row) => sum + row.interest, 0).toFixed(2));
  const totalPayment = Number(schedule.reduce((sum, row) => sum + row.payment + row.prepayment, 0).toFixed(2));

  return {
    schedule,
    summary: { totalInterest, totalPayment, closingDate: schedule.at(-1)?.date ?? input.firstPaymentDate },
    monthlyPayment: input.paymentType === 'annuity' ? calculateAnnuity(input.loanAmount, input.annualRate, termMonths) : undefined,
  };
}
