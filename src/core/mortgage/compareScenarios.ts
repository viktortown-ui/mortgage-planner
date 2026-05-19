import { buildSchedule } from './buildSchedule';
import type { ComparisonResult, MortgageInput } from './types';

export function compareScenarios(input: MortgageInput): ComparisonResult | null {
  try {
    const baselineInput: MortgageInput = { ...input, prepayments: [] };
    const baseline = buildSchedule(baselineInput, false);
    const custom = buildSchedule(input, true);
    if (!baseline || !custom) return null;

    return {
      baseline,
      withPrepayments: custom,
      interestSavings: Number((baseline.summary.totalInterest - custom.summary.totalInterest).toFixed(2)),
      monthsSaved: baseline.schedule.length - custom.schedule.length,
    };
  } catch {
    return null;
  }
}
