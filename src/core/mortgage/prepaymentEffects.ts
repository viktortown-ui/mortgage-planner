import { compareScenarios } from './compareScenarios';
import { expandPrepaymentRules } from './prepaymentRules';
import type { MortgageInput, PrepaymentEvent, PrepaymentMode } from './types';

export interface PrepaymentEffectInsight {
  id: string;
  title: string;
  date: string;
  amount: number;
  mode: PrepaymentMode;
  interestSavings: number;
  monthsSaved: number;
  count: number;
  totalAmount: number;
  paymentBefore?: number;
  paymentAfter?: number;
  monthlyFreed?: number;
  isFuture?: boolean;
}

function withoutRule(input: MortgageInput, ruleId: string): MortgageInput {
  return { ...input, prepayments: input.prepayments.filter((rule, index) => (rule.id ?? `legacy-${index}`) !== ruleId) };
}

export function calculatePrepaymentEffects(input: MortgageInput, limit = 8): PrepaymentEffectInsight[] {
  const full = compareScenarios(input);
  if (!full || input.prepayments.every((rule) => rule.amount <= 0)) return [];
  return input.prepayments.slice(0, limit).flatMap((rule, index) => {
    if (rule.amount <= 0) return [];
    const ruleId = rule.id ?? `legacy-${index}`;
    const expanded = expandPrepaymentRules([rule], input);
    const without = compareScenarios(withoutRule(input, ruleId));
    const interestSavings = Number(((without?.withPrepayments.summary.totalInterest ?? full.withPrepayments.summary.totalInterest) - full.withPrepayments.summary.totalInterest).toFixed(2));
    const monthsSaved = (without?.withPrepayments.schedule.length ?? full.withPrepayments.schedule.length) - full.withPrepayments.schedule.length;
    const totalAmount = expanded.reduce((sum, event: PrepaymentEvent) => sum + event.amount, 0);
    const firstReducePaymentDate = expanded.find((event) => event.mode === 'reducePayment')?.date;
    const reducePaymentRowIndex = firstReducePaymentDate ? full.withPrepayments.schedule.findIndex((row) => row.date.slice(0, 7) === firstReducePaymentDate.slice(0, 7)) : -1;
    const paymentBefore = reducePaymentRowIndex >= 0 ? full.withPrepayments.schedule[reducePaymentRowIndex]?.payment : undefined;
    const paymentAfter = reducePaymentRowIndex >= 0 ? (full.withPrepayments.schedule[reducePaymentRowIndex + 1]?.payment ?? paymentBefore) : undefined;
    const monthlyFreed = paymentBefore !== undefined && paymentAfter !== undefined ? Number(Math.max(0, paymentBefore - paymentAfter).toFixed(2)) : undefined;
    const today = new Date().toISOString().slice(0, 10);
    return [{ id: ruleId, title: rule.kind === 'regular' ? 'Регулярная досрочка' : 'Досрочный платёж', date: rule.date, amount: rule.amount, mode: rule.mode, interestSavings, monthsSaved, count: expanded.length, totalAmount, paymentBefore, paymentAfter, monthlyFreed, isFuture: rule.date > today }];
  });
}
