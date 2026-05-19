import type { MortgageInput, PaymentType, Prepayment, PrepaymentMode } from '../core/mortgage/types';

function toFiniteNumber(value: unknown, fallback: number): number {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : fallback;
}

function asNonNegative(value: unknown, fallback: number): number {
  return Math.max(0, toFiniteNumber(value, fallback));
}

function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function normalizePaymentType(raw: unknown): PaymentType {
  return raw === 'differentiated' ? 'differentiated' : 'annuity';
}

function normalizeMode(raw: unknown): PrepaymentMode {
  return raw === 'reducePayment' ? 'reducePayment' : 'reduceTerm';
}

function normalizePrepayment(raw: unknown, firstPaymentDate: string): Prepayment {
  const source = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  return {
    date: isIsoDate(source.date) ? source.date : firstPaymentDate,
    amount: asNonNegative(source.amount, 0),
    mode: normalizeMode(source.mode),
  };
}

export function normalizeMortgageInput(raw: unknown, defaultInput: MortgageInput): MortgageInput {
  if (typeof raw !== 'object' || raw === null) {
    return { ...defaultInput, prepayments: [] };
  }

  const source = raw as Record<string, unknown>;
  const propertyPrice = asNonNegative(source.propertyPrice, defaultInput.propertyPrice);
  const downPayment = Math.min(
    asNonNegative(source.downPayment, defaultInput.downPayment),
    propertyPrice,
  );
  const annualRate = asNonNegative(source.annualRate, defaultInput.annualRate);
  const termYears = asNonNegative(source.termYears, defaultInput.termYears);
  const firstPaymentDate = isIsoDate(source.firstPaymentDate)
    ? source.firstPaymentDate
    : defaultInput.firstPaymentDate;

  const rawPrepayments = Array.isArray(source.prepayments) ? source.prepayments : [];

  return {
    propertyPrice,
    downPayment,
    loanAmount: Math.max(0, Number((propertyPrice - downPayment).toFixed(2))),
    annualRate,
    termYears,
    firstPaymentDate,
    paymentType: normalizePaymentType(source.paymentType),
    prepayments: rawPrepayments.map((item) => normalizePrepayment(item, firstPaymentDate)),
  };
}
