import { buildSchedule } from './buildSchedule';
import type { CalculationResult, MortgageInput, PaymentRow, Prepayment, PrepaymentMode } from './types';

export type AutoFrequency = 'monthly' | 'semiAnnual' | 'annual';

export interface AutoScenarioSettings {
  amount: number;
  frequency: AutoFrequency;
  mode: PrepaymentMode;
}

const frequencyToMonths: Record<AutoFrequency, number> = {
  monthly: 1,
  semiAnnual: 6,
  annual: 12,
};

function addMonths(isoDate: string, months: number): string {
  const date = new Date(isoDate);
  date.setMonth(date.getMonth() + months);
  return date.toISOString().slice(0, 10);
}

export function buildAutoPrepayments(input: MortgageInput, settings: AutoScenarioSettings): Prepayment[] {
  if (settings.amount <= 0) return [];
  const termMonths = input.termYears * 12;
  const step = frequencyToMonths[settings.frequency];
  const list: Prepayment[] = [];
  for (let month = 0; month < termMonths; month += step) {
    list.push({ date: addMonths(input.firstPaymentDate, month), amount: settings.amount, mode: settings.mode });
  }
  return list;
}

export function buildAutoScenario(input: MortgageInput, settings: AutoScenarioSettings): CalculationResult | null {
  const prepayments = buildAutoPrepayments(input, settings);
  if (!prepayments.length) return null;
  return buildSchedule({ ...input, prepayments }, true);
}

export function findBestPrepaymentMonth(schedule: PaymentRow[]): PaymentRow | null {
  const rows = schedule.filter((row) => row.prepayment > 0);
  if (!rows.length) return null;
  return rows.sort((a, b) => (b.interest - b.principal) - (a.interest - a.principal))[0];
}
