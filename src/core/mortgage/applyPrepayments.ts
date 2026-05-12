import type { Prepayment } from './types';

export interface DebtAdjustment {
  remainingDebt: number;
  monthlyPayment: number;
  termMonthsLeft: number;
}

export function applyPrepayments(
  prepaymentsByDate: Map<string, Prepayment[]>,
  date: string,
  remainingDebt: number,
  monthlyPayment: number,
  monthlyRate: number,
  termMonthsLeft: number,
): { prepaymentAmount: number; adjustment: DebtAdjustment } {
  const items = prepaymentsByDate.get(date) ?? [];
  let debt = remainingDebt;
  let payment = monthlyPayment;
  let term = termMonthsLeft;
  let prepaymentAmount = 0;

  items.forEach((item) => {
    if (debt <= 0) {
      return;
    }

    const amount = Math.min(item.amount, debt);
    debt = Number((debt - amount).toFixed(2));
    prepaymentAmount += amount;

    if (item.mode === 'reducePayment' && term > 0 && monthlyRate > 0) {
      const factor = Math.pow(1 + monthlyRate, term);
      payment = Number(((debt * monthlyRate * factor) / (factor - 1)).toFixed(2));
    }

    if (item.mode === 'reduceTerm' && payment > 0 && monthlyRate > 0) {
      const value = Math.log(payment / (payment - debt * monthlyRate)) / Math.log(1 + monthlyRate);
      term = Math.max(1, Math.ceil(value));
    }
  });

  return {
    prepaymentAmount: Number(prepaymentAmount.toFixed(2)),
    adjustment: {
      remainingDebt: debt,
      monthlyPayment: payment,
      termMonthsLeft: term,
    },
  };
}
