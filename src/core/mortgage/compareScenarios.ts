import { buildSchedule } from './buildSchedule';
import type { ComparisonResult, MortgageInput } from './types';

export function compareScenarios(input: MortgageInput): ComparisonResult {
  const baselineInput: MortgageInput = { ...input, prepayments: [] };
  const baseline = buildSchedule(baselineInput, false);
  const custom = buildSchedule(input, true);

  return {
    baseline,
    withPrepayments: custom,
    interestSavings: Number((baseline.summary.totalInterest - custom.summary.totalInterest).toFixed(2)),
    monthsSaved: baseline.schedule.length - custom.schedule.length,
  };
}
