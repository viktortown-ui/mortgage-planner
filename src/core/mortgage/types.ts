export type PaymentType = 'annuity' | 'differentiated';

export type PrepaymentMode = 'reduceTerm' | 'reducePayment';
export type ScenarioKind = 'baseline' | 'userPrepayments' | 'autoPrepayment';
export type RuleFrequency = 'once' | 'monthly' | 'quarterly' | 'semiAnnual' | 'annual';

export type InsuranceType = 'propertyInsurance' | 'lifeInsurance' | 'titleInsurance' | 'other';

export interface Prepayment {
  id?: string;
  kind?: 'once' | 'regular';
  date: string;
  amount: number;
  mode: PrepaymentMode;
  frequency?: Exclude<RuleFrequency, 'once'>;
  endDate?: string;
  repeatCount?: number;
}

export interface PrepaymentEvent {
  id?: string;
  ruleId?: string;
  date: string;
  amount: number;
  mode: PrepaymentMode;
  kind?: 'once' | 'regular';
  frequency?: Exclude<RuleFrequency, 'once'>;
}

export interface InsuranceRule {
  id: string;
  title: string;
  type: InsuranceType;
  amount: number;
  startDate: string;
  frequency: RuleFrequency;
  endDate?: string;
  enabled: boolean;
}

export interface InsuranceEvent {
  date: string;
  title: string;
  type: InsuranceType;
  amount: number;
}

export interface MortgageInput {
  propertyPrice: number;
  downPayment: number;
  loanAmount: number;
  annualRate: number;
  termYears: number;
  firstPaymentDate: string;
  paymentType: PaymentType;
  prepayments: Prepayment[];
  insuranceRules: InsuranceRule[];
  incomeMonthly?: number;
}

export interface PaymentRow {
  monthIndex: number;
  date: string;
  payment: number;
  interest: number;
  principal: number;
  prepayment: number;
  prepaymentEvents?: PrepaymentEvent[];
  insuranceCost: number;
  insuranceEvents?: InsuranceEvent[];
  realPaid: number;
  remainingDebt: number;
}

export interface MortgageSummary {
  totalInterest: number;
  totalPayment: number;
  closingDate: string;
  totalInsuranceCost: number;
  totalRealCost: number;
  realCostMultiplier: number;
  insuranceEvents: InsuranceEvent[];
}

export interface CalculationResult {
  schedule: PaymentRow[];
  summary: MortgageSummary;
  monthlyPayment?: number;
}

export interface ScenarioResult {
  kind: ScenarioKind;
  label: string;
  result: CalculationResult;
}

export interface ComparisonResult {
  baseline: CalculationResult;
  withPrepayments: CalculationResult;
  interestSavings: number;
  monthsSaved: number;
}
