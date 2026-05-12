import { buildSchedule } from './buildSchedule';
import type { ComparisonResult, MortgageInput } from './types';

export function compareScenarios(input: MortgageInput): ComparisonResult {
  const baselineInput: MortgageInput = { ...input, prepayments: [] };
  const baseline = buildSchedule(baselineInput, false);
  const withPrepayments = buildSchedule(input, true);

  return {
    baseline,
    withPrepayments,
    interestSavings: Number((baseline.summary.totalInterest - withPrepayments.summary.totalInterest).toFixed(2)),
    monthsSaved: baseline.schedule.length - withPrepayments.schedule.length,
  };
}
