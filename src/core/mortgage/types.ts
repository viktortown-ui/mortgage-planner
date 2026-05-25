export type PaymentType = 'annuity' | 'differentiated';

export type PrepaymentMode = 'reduceTerm' | 'reducePayment';
export type ScenarioKind = 'baseline' | 'userPrepayments' | 'autoPrepayment';

export interface Prepayment {
  date: string;
  amount: number;
  mode: PrepaymentMode;
}

export interface PrepaymentEvent {
  date: string;
  amount: number;
  mode: PrepaymentMode;
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
}

export interface PaymentRow {
  monthIndex: number;
  date: string;
  payment: number;
  interest: number;
  principal: number;
  prepayment: number;
  prepaymentEvents?: PrepaymentEvent[];
  remainingDebt: number;
}

export interface MortgageSummary {
  totalInterest: number;
  totalPayment: number;
  closingDate: string;
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
