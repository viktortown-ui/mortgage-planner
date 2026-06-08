import type { InsuranceEvent, InsuranceRule, RuleFrequency } from './types';

const frequencyMonths: Record<RuleFrequency, number> = { once: 0, monthly: 1, quarterly: 3, semiAnnual: 6, annual: 12 };

function isValidDate(value: string | undefined): value is string {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

export function addMonthsClamped(isoDate: string, months: number): string {
  const source = new Date(isoDate);
  if (Number.isNaN(source.getTime())) return isoDate;
  const day = source.getDate();
  const result = new Date(source);
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, lastDay));
  return result.toISOString().slice(0, 10);
}

export function expandInsuranceSchedule(rules: InsuranceRule[], closingDate: string): InsuranceEvent[] {
  if (!isValidDate(closingDate)) return [];
  const events: InsuranceEvent[] = [];
  rules.forEach((rule) => {
    if (!rule.enabled || rule.amount <= 0 || !isValidDate(rule.startDate)) return;
    const step = frequencyMonths[rule.frequency];
    const endDate = isValidDate(rule.endDate) && rule.endDate < closingDate ? rule.endDate : closingDate;
    let date = rule.startDate;
    let guard = 0;
    while (date <= endDate && guard < 1200) {
      events.push({ date, title: rule.title || 'Страховка', type: rule.type, amount: Number(rule.amount.toFixed(2)) });
      if (step === 0) break;
      date = addMonthsClamped(date, step);
      guard += 1;
    }
  });
  return events.sort((a, b) => a.date.localeCompare(b.date));
}
