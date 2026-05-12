import { buildSchedule } from './buildSchedule';
import type { ComparisonResult, MortgageInput, Prepayment, ScenarioResult } from './types';

function addMonths(isoDate: string, months: number): string {
  const date = new Date(isoDate);
  date.setMonth(date.getMonth() + months);
  return date.toISOString().slice(0, 10);
}

function generatePeriodicPrepayments(input: MortgageInput, everyMonths: number): Prepayment[] {
  const termMonths = input.termYears * 12;
  const template = input.prepayments[0];
  if (!template || template.amount <= 0) {
    return [];
  }

  const list: Prepayment[] = [];
  for (let month = 0; month < termMonths; month += everyMonths) {
    list.push({
      date: addMonths(input.firstPaymentDate, month),
      amount: template.amount,
      mode: template.mode,
    });
  }
  return list;
}

export function compareScenarios(input: MortgageInput): ComparisonResult {
  const baselineInput: MortgageInput = { ...input, prepayments: [] };
  const monthlyInput: MortgageInput = { ...input, prepayments: generatePeriodicPrepayments(input, 1) };
  const semiAnnualInput: MortgageInput = { ...input, prepayments: generatePeriodicPrepayments(input, 6) };

  const baseline = buildSchedule(baselineInput, false);
  const monthly = buildSchedule(monthlyInput, true);
  const semiAnnual = buildSchedule(semiAnnualInput, true);
  const custom = buildSchedule(input, true);

  const scenarios: ScenarioResult[] = [
    { kind: 'baseline', label: 'Базовый', result: baseline },
    { kind: 'monthlyPrepayment', label: 'Досрочный ежемесячно', result: monthly },
    { kind: 'semiAnnualPrepayment', label: 'Досрочный раз в 6 месяцев', result: semiAnnual },
  ];

  const bestScenario = [...scenarios].sort((a, b) => a.result.summary.totalInterest - b.result.summary.totalInterest)[0];

  return {
    baseline,
    withPrepayments: custom,
    scenarios,
    interestSavings: Number((baseline.summary.totalInterest - custom.summary.totalInterest).toFixed(2)),
    monthsSaved: baseline.schedule.length - custom.schedule.length,
    bestScenario,
  };
}
