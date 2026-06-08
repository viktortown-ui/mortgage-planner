import type { MortgageInput, Prepayment, PrepaymentEvent } from './types';
import { addMonthsClamped } from './insuranceSchedule';

const frequencyMonths: Record<NonNullable<Prepayment['frequency']>, number> = { monthly: 1, quarterly: 3, semiAnnual: 6, annual: 12 };

export function expandPrepaymentRules(prepayments: Prepayment[], input: Pick<MortgageInput, 'firstPaymentDate' | 'termYears'>): PrepaymentEvent[] {
  const maxDate = addMonthsClamped(input.firstPaymentDate, Math.max(1, Math.floor(input.termYears * 12)) + 600);
  const events: PrepaymentEvent[] = [];
  prepayments.forEach((rule, index) => {
    if (rule.amount <= 0) return;
    const id = rule.id ?? `legacy-${index}`;
    if (rule.kind !== 'regular') {
      events.push({ id: `${id}-0`, ruleId: id, date: rule.date, amount: rule.amount, mode: rule.mode, kind: 'once' });
      return;
    }
    const step = frequencyMonths[rule.frequency ?? 'monthly'];
    const limitByDate = rule.endDate && rule.endDate < maxDate ? rule.endDate : maxDate;
    const repeatLimit = rule.repeatCount && rule.repeatCount > 0 ? Math.floor(rule.repeatCount) : 1200;
    let date = rule.date;
    for (let count = 0; count < repeatLimit && date <= limitByDate; count += 1) {
      events.push({ id: `${id}-${count}`, ruleId: id, date, amount: rule.amount, mode: rule.mode, kind: 'regular', frequency: rule.frequency ?? 'monthly' });
      date = addMonthsClamped(date, step);
    }
  });
  return events.sort((a, b) => a.date.localeCompare(b.date));
}
