import { compareScenarios } from './compareScenarios';
import { buildSnapshot } from './buildSnapshot';
import { buildAutoScenario, type AutoScenarioSettings } from './scenarioInsights';
import { compareSmartScenario, resolveStrategyStartPoint, type SmartScenarioInput, type SmartScenarioResult, type StrategyStartSettings } from './strategyStart';
import type { ComparisonResult, MortgageInput, PaymentType } from './types';

export type { ScenarioFrequency, SmartScenarioInput, StrategyStartMode, StrategyStartSettings, StrategyStartPoint, SmartScenarioResult } from './strategyStart';

export interface MortgageViewModel {
  normalizedInput: MortgageInput;
  comparison: ComparisonResult | null;
  snapshot: ReturnType<typeof buildSnapshot>;
  autoScenarioResult: ReturnType<typeof buildAutoScenario>;
  strategyStartPoint: ReturnType<typeof resolveStrategyStartPoint>;
  smartScenarioResults: SmartScenarioResult[];
  hasPrepaymentEffect: boolean;
}

export function buildMortgageViewModel(
  normalizedInput: MortgageInput,
  autoScenario: AutoScenarioSettings,
  smartScenarios: SmartScenarioInput[],
  strategyStart: StrategyStartSettings = { mode: 'currentSnapshot' },
  asOf: Date = new Date(),
): MortgageViewModel {
  const comparison = compareScenarios(normalizedInput);
  const snapshot = buildSnapshot(normalizedInput, asOf);
  const autoScenarioResult = buildAutoScenario(normalizedInput, autoScenario);
  const strategyStartPoint = resolveStrategyStartPoint(normalizedInput, strategyStart, asOf);
  const smartScenarioResults = strategyStartPoint
    ? smartScenarios.map((scenario) => compareSmartScenario(normalizedInput, scenario, strategyStartPoint))
    : smartScenarios.map((scenario) => ({ id: scenario.id, result: null, warnings: ['Расчёт точки старта стратегии временно невозможен.'] }));

  return {
    normalizedInput,
    comparison,
    snapshot,
    autoScenarioResult,
    strategyStartPoint,
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
