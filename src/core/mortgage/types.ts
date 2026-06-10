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

export interface MortgageFullPlan {
  totalPayment: number;
  totalInterest: number;
  totalInsuranceCost: number;
  totalRealCost: number;
  realCostMultiplier: number;
  closingDate: string;
  monthsTotal: number;
  interestSavings: number;
  monthsSaved: number;
}

export interface MortgageCurrentSnapshot {
  asOfDate: string;
  elapsedMonths: number;
  paidTotal: number;
  paidInterest: number;
  paidPrincipal: number;
  paidPrepayments: number;
  paidInsurance: number;
  currentDebt: number;
  remainingToPay: number;
  remainingInterest: number;
  remainingInsurance: number;
  progressPercent: number;
}

export interface MortgageScenarioSummary {
  baseline: MortgageSummary;
  active: MortgageSummary;
  interestSavings: number;
  monthsSaved: number;
  hasPrepaymentEffect: boolean;
}

export interface MortgageSnapshot {
  fullPlan: MortgageFullPlan;
  currentSnapshot: MortgageCurrentSnapshot;
  scenarioSummary: MortgageScenarioSummary;
  calendarEvents: PaymentRow[];
  chartsData: PaymentRow[];
  tableData: PaymentRow[];
  comparison: ComparisonResult;
}
