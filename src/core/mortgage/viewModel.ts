import { compareScenarios } from './compareScenarios';
import { buildSnapshot } from './buildSnapshot';
import { buildAutoScenario, type AutoScenarioSettings } from './scenarioInsights';
import type { ComparisonResult, MortgageInput, PaymentType, PrepaymentMode } from './types';

export type ScenarioFrequency = 'monthly' | 'quarterly' | 'semiAnnual' | 'annual';

export interface SmartScenarioInput {
  id: 'A' | 'B' | 'C';
  amount: number;
  frequency: ScenarioFrequency;
  mode: PrepaymentMode;
  startDate?: string;
  durationMonths?: number;
}

export interface MortgageViewModel {
  normalizedInput: MortgageInput;
  comparison: ComparisonResult | null;
  snapshot: ReturnType<typeof buildSnapshot>;
  autoScenarioResult: ReturnType<typeof buildAutoScenario>;
  smartScenarioResults: Array<{ id: 'A' | 'B' | 'C'; result: ComparisonResult | null }>;
  hasPrepaymentEffect: boolean;
}

function addMonths(isoDate: string, months: number): string {
  const date = new Date(isoDate);
  date.setMonth(date.getMonth() + months);
  return date.toISOString().slice(0, 10);
}

const stepByFrequency: Record<ScenarioFrequency, number> = { monthly: 1, quarterly: 3, semiAnnual: 6, annual: 12 };

function buildScenarioPrepayments(input: MortgageInput, scenario: SmartScenarioInput) {
  if (scenario.amount <= 0) return [];
  const start = scenario.startDate || input.firstPaymentDate;
  const termMonths = input.termYears * 12;
  const duration = scenario.durationMonths && scenario.durationMonths > 0 ? Math.min(termMonths, scenario.durationMonths) : termMonths;
  const step = stepByFrequency[scenario.frequency];
  const list = [] as MortgageInput['prepayments'];
  for (let month = 0; month < duration; month += step) {
    list.push({ date: addMonths(start, month), amount: scenario.amount, mode: scenario.mode });
  }
  return list;
}

export function buildMortgageViewModel(
  normalizedInput: MortgageInput,
  autoScenario: AutoScenarioSettings,
  smartScenarios: SmartScenarioInput[],
): MortgageViewModel {
  const comparison = compareScenarios(normalizedInput);
  const snapshot = buildSnapshot(normalizedInput);
  const autoScenarioResult = buildAutoScenario(normalizedInput, autoScenario);
  const smartScenarioResults = smartScenarios.map((scenario) => {
    const prepayments = buildScenarioPrepayments(normalizedInput, scenario);
    return { id: scenario.id, result: prepayments.length ? compareScenarios({ ...normalizedInput, prepayments }) : null };
  });
  return {
    normalizedInput,
    comparison,
    snapshot,
    autoScenarioResult,
    smartScenarioResults,
    hasPrepaymentEffect: (comparison?.interestSavings ?? 0) > 0 || (comparison?.monthsSaved ?? 0) > 0,
  };
}

export interface CanonicalMortgageFormState {
  propertyPrice: number;
  downPayment: number;
  annualRate: number;
  termYears: number;
  firstPaymentDate: string;
  paymentType: PaymentType;
  prepayments: MortgageInput['prepayments'];
}
