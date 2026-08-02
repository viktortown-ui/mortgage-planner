import { describe, expect, it } from 'vitest';
import type { MortgageInput } from '../../core/mortgage/types';
import { getCalculationError } from '../calculationError';

const input: MortgageInput = {
  propertyPrice: 5_000_000,
  downPayment: 1_000_000,
  loanAmount: 4_000_000,
  annualRate: 12,
  termYears: 20,
  firstPaymentDate: '2026-06-01',
  paymentType: 'annuity',
  prepayments: [],
  insuranceRules: [],
};

describe('calculation error messages', () => {
  it('explains which saved parameter must be corrected', () => {
    expect(getCalculationError({ ...input, annualRate: 0 }, false)).toContain('ставку');
    expect(getCalculationError({ ...input, termYears: 0 }, false)).toContain('срок');
    expect(getCalculationError({ ...input, downPayment: input.propertyPrice, loanAmount: 0 }, false)).toContain('взнос');
  });

  it('returns no error for a ready calculation', () => {
    expect(getCalculationError(input, true)).toBe('');
  });
});
