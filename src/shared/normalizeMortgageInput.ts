import type { InsuranceRule, InsuranceType, MortgageInput, PaymentType, Prepayment, PrepaymentMode, RuleFrequency } from '../core/mortgage/types';

function toFiniteNumber(value: unknown, fallback: number): number {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : fallback;
}

function asNonNegative(value: unknown, fallback: number): number {
  return Math.max(0, toFiniteNumber(value, fallback));
}

function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function normalizePaymentType(raw: unknown): PaymentType { return raw === 'differentiated' ? 'differentiated' : 'annuity'; }
function normalizeMode(raw: unknown): PrepaymentMode { return raw === 'reducePayment' ? 'reducePayment' : 'reduceTerm'; }
function normalizeInsuranceType(raw: unknown): InsuranceType {
  return raw === 'lifeInsurance' || raw === 'titleInsurance' || raw === 'other' ? raw : 'propertyInsurance';
}
function normalizeFrequency(raw: unknown): RuleFrequency {
  return raw === 'monthly' || raw === 'quarterly' || raw === 'semiAnnual' || raw === 'annual' ? raw : 'once';
}

function normalizePrepayment(raw: unknown, firstPaymentDate: string, index: number): Prepayment {
  const source = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const kind = source.kind === 'regular' ? 'regular' : 'once';
  const repeatCount = source.repeatCount === undefined || source.repeatCount === '' ? undefined : Math.max(0, Math.floor(toFiniteNumber(source.repeatCount, 0)));
  return {
    id: typeof source.id === 'string' ? source.id : `prepayment-${index}-${firstPaymentDate}`,
    kind,
    date: isIsoDate(source.date) ? source.date : firstPaymentDate,
    amount: asNonNegative(source.amount, 0),
    mode: normalizeMode(source.mode),
    frequency: kind === 'regular' ? (normalizeFrequency(source.frequency) === 'once' ? 'monthly' : normalizeFrequency(source.frequency) as Exclude<RuleFrequency, 'once'>) : undefined,
    endDate: isIsoDate(source.endDate) ? source.endDate : undefined,
    repeatCount: repeatCount && repeatCount > 0 ? repeatCount : undefined,
  };
}

function normalizeInsurance(raw: unknown, firstPaymentDate: string, index: number): InsuranceRule {
  const source = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  return {
    id: typeof source.id === 'string' ? source.id : `insurance-${index}-${firstPaymentDate}`,
    title: typeof source.title === 'string' && source.title.trim() ? source.title : 'Страховка',
    type: normalizeInsuranceType(source.type),
    amount: asNonNegative(source.amount, 0),
    startDate: isIsoDate(source.startDate) ? source.startDate : firstPaymentDate,
    frequency: normalizeFrequency(source.frequency),
    endDate: isIsoDate(source.endDate) ? source.endDate : undefined,
    enabled: typeof source.enabled === 'boolean' ? source.enabled : true,
  };
}

export function normalizeMortgageInput(raw: unknown, defaultInput: MortgageInput): MortgageInput {
  if (typeof raw !== 'object' || raw === null) return { ...defaultInput, prepayments: [], insuranceRules: [], incomeMonthly: undefined };

  const source = raw as Record<string, unknown>;
  const propertyPrice = asNonNegative(source.propertyPrice, defaultInput.propertyPrice);
  const downPayment = Math.min(asNonNegative(source.downPayment, defaultInput.downPayment), propertyPrice);
  const annualRate = asNonNegative(source.annualRate, defaultInput.annualRate);
  const termYears = asNonNegative(source.termYears, defaultInput.termYears);
  const firstPaymentDate = isIsoDate(source.firstPaymentDate) ? source.firstPaymentDate : defaultInput.firstPaymentDate;
  const rawPrepayments = Array.isArray(source.prepayments) ? source.prepayments : [];
  const rawInsuranceRules = Array.isArray(source.insuranceRules) ? source.insuranceRules : [];
  const incomeMonthly = source.incomeMonthly === undefined || source.incomeMonthly === '' ? undefined : asNonNegative(source.incomeMonthly, 0);

  return {
    propertyPrice,
    downPayment,
    loanAmount: Math.max(0, Number((propertyPrice - downPayment).toFixed(2))),
    annualRate,
    termYears,
    firstPaymentDate,
    paymentType: normalizePaymentType(source.paymentType),
    prepayments: rawPrepayments.map((item, index) => normalizePrepayment(item, firstPaymentDate, index)),
    insuranceRules: rawInsuranceRules.map((item, index) => normalizeInsurance(item, firstPaymentDate, index)),
    incomeMonthly,
  };
}
