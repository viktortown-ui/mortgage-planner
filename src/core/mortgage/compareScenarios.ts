import { buildSchedule } from './buildSchedule';
import type { ComparisonResult, MortgageInput } from './types';

export function compareScenarios(input: MortgageInput): ComparisonResult | null {
  const baselineInput: MortgageInput = { ...input, prepayments: [] };
  const baseline = buildSchedule(baselineInput, false);
  const custom = buildSchedule(input, true);
  if (!baseline || !custom) return null;
  const interestSavings = Number((baseline.summary.totalInterest - custom.summary.totalInterest).toFixed(2));
  return {
    baseline,
    withPrepayments: custom,
    interestSavings,
    interestSavedByPrepayments: interestSavings,
    monthsSaved: baseline.schedule.length - custom.schedule.length,
  };
}

export function runReactivityChecks(base: MortgageInput): string[] {
  const checks: string[] = [];
  const r1 = compareScenarios(base);
  const r2 = compareScenarios({ ...base, firstPaymentDate: '2027-01-01' });
  if (r1?.withPrepayments.schedule[0]?.date !== r2?.withPrepayments.schedule[0]?.date) checks.push('ok:firstPaymentDate->schedule');
  const normalizedLoan = Math.max(0, base.propertyPrice + 1000 - base.downPayment);
  if (normalizedLoan !== base.loanAmount) checks.push('ok:propertyPrice->loanAmount');
  const r3 = compareScenarios({ ...base, annualRate: base.annualRate + 1 });
  if ((r3?.withPrepayments.summary.totalInterest ?? 0) !== (r1?.withPrepayments.summary.totalInterest ?? 0)) checks.push('ok:annualRate->totalInterest');
  return checks;
}
