import { compareScenarios } from './compareScenarios';
import type { MortgageInput } from './types';

export interface PrepaymentDiagnosticCase {
  id: 'A' | 'B' | 'C' | 'D';
  passed: boolean;
}

export function runPrepaymentDiagnostics(base: MortgageInput): PrepaymentDiagnosticCase[] {
  const aInput: MortgageInput = { ...base, prepayments: [{ date: '2024-01-12', amount: 300000, mode: 'reduceTerm' }] };
  const bInput: MortgageInput = { ...base, prepayments: [{ date: '2024-01-10', amount: 300000, mode: 'reduceTerm' }] };
  const cInput: MortgageInput = { ...base, prepayments: [{ date: '2024-01-12', amount: 300000, mode: 'reduceTerm' }, { date: '2024-01-25', amount: 200000, mode: 'reduceTerm' }] };
  const dInput: MortgageInput = { ...base, prepayments: [{ date: '2024-01-12', amount: 0, mode: 'reduceTerm' }] };

  const a = compareScenarios(aInput);
  const b = compareScenarios(bInput);
  const c = compareScenarios(cInput);
  const d = compareScenarios(dInput);

  return [
    { id: 'A', passed: Boolean(a && a.interestSavings > 0 && a.monthsSaved > 0) },
    { id: 'B', passed: Boolean(b && b.withPrepayments.schedule.some((r) => r.prepayment > 0)) },
    { id: 'C', passed: Boolean(c && c.withPrepayments.schedule.some((r) => r.date.slice(0, 7) === '2024-01' && Math.round(r.prepayment) === 500000)) },
    { id: 'D', passed: Boolean(d && d.interestSavings === 0 && d.monthsSaved === 0) },
  ];
}
