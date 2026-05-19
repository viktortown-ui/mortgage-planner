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
    if (debt <= 0) return;

    const rawAmount = Number(item.amount);
    const amount = Number.isFinite(rawAmount) ? Math.max(0, Math.min(rawAmount, debt)) : 0;
    debt = Number((debt - amount).toFixed(2));
    prepaymentAmount += amount;

    if (item.mode === 'reducePayment' && term > 0 && monthlyRate > 0) {
      const factor = Math.pow(1 + monthlyRate, term);
      if (Number.isFinite(factor) && factor !== 1) {
        payment = Number(((debt * monthlyRate * factor) / (factor - 1)).toFixed(2));
      }
    }

    if (item.mode === 'reduceTerm' && payment > 0 && monthlyRate > 0) {
      const denominator = payment - debt * monthlyRate;
      if (denominator > 0) {
        const value = Math.log(payment / denominator) / Math.log(1 + monthlyRate);
        if (Number.isFinite(value)) {
          term = Math.max(1, Math.ceil(value));
        }
      }
    }
  });

  return {
    prepaymentAmount: Number(prepaymentAmount.toFixed(2)),
    adjustment: { remainingDebt: Math.max(0, debt), monthlyPayment: payment, termMonthsLeft: term },
  };
}
