import { useMemo, useState } from 'react';
import { compareScenarios } from './core/mortgage/compareScenarios';
import type { MortgageInput } from './core/mortgage/types';
import type { AutoScenarioSettings } from './core/mortgage/scenarioInsights';
import { MortgageInputForm } from './features/calculator/MortgageInputForm';
import { ResultSummary } from './features/calculator/ResultSummary';
import { PaymentCalendar } from './features/calendar/PaymentCalendar';
import { PaymentTable } from './features/schedule/PaymentTable';
import { DebtChart } from './features/charts/DebtChart';
import { InterestPrincipalChart } from './features/charts/InterestPrincipalChart';
import { loadFromStorage, saveToStorage } from './shared/storage';
import './styles/global.css';

const storageKey = 'mortgage-planner-v1';
const defaultInput: MortgageInput = { propertyPrice: 10000000, downPayment: 2000000, loanAmount: 8000000, annualRate: 12, termYears: 20, firstPaymentDate: '2026-06-01', paymentType: 'annuity', prepayments: [] };
const defaultAuto: AutoScenarioSettings = { amount: 0, frequency: 'monthly', mode: 'reduceTerm' };

const withDerivedLoanAmount = (raw: MortgageInput): MortgageInput => ({ ...raw, loanAmount: raw.propertyPrice - raw.downPayment });

function App() {
  const [input, setInput] = useState<MortgageInput>(() => withDerivedLoanAmount(loadFromStorage(storageKey, defaultInput)));
  const [autoScenario, setAutoScenario] = useState<AutoScenarioSettings>(defaultAuto);
  const [error, setError] = useState('');

  const safeSetInput = (next: MortgageInput) => {
    const normalized = withDerivedLoanAmount(next);
    setInput(normalized);
    saveToStorage(storageKey, normalized);
  };

  const result = useMemo(() => {
    if (input.downPayment > input.propertyPrice) {
      setError('Первоначальный взнос не может быть больше стоимости недвижимости.');
      return null;
    }
    if (input.annualRate <= 0 || input.termYears <= 0 || input.loanAmount <= 0) {
      setError('Ставка, срок и сумма кредита должны быть больше нуля.');
      return null;
    }
    setError('');
    return compareScenarios(input);
  }, [input]);

  return <div className="app"><header>Ипотечный планировщик</header><main>
    <aside><MortgageInputForm input={input} onChange={safeSetInput} error={error} /></aside>
    <section className="results">{result ? <>
      <ResultSummary result={result} input={input} autoScenario={autoScenario} setAutoScenario={setAutoScenario} />
      <PaymentCalendar schedule={result.withPrepayments.schedule} />
      <DebtChart schedule={result.withPrepayments.schedule} />
      <InterestPrincipalChart schedule={result.withPrepayments.schedule} />
      <PaymentTable schedule={result.withPrepayments.schedule} prepayments={input.prepayments} />
    </> : <div className="panel">Введите корректные данные для расчёта.</div>}</section>
  </main></div>;
}

export default App;
