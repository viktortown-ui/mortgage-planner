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
import { normalizeMortgageInput } from './shared/normalizeMortgageInput';
import { resetAppData, STORAGE_KEY } from './shared/resetAppData';
import './styles/global.css';

const defaultInput: MortgageInput = { propertyPrice: 10000000, downPayment: 2000000, loanAmount: 8000000, annualRate: 12, termYears: 20, firstPaymentDate: '2026-06-01', paymentType: 'annuity', prepayments: [] };
const defaultAuto: AutoScenarioSettings = { amount: 0, frequency: 'monthly', mode: 'reduceTerm' };

function App() {
  const [input, setInput] = useState<MortgageInput>(() => loadFromStorage(STORAGE_KEY, defaultInput));
  const [autoScenario, setAutoScenario] = useState<AutoScenarioSettings>(defaultAuto);
  const [error, setError] = useState('');

  const handleResetData = async () => {
    const shouldReset = window.confirm('Сбросить сохранённые параметры ипотечного планировщика?');
    if (!shouldReset) return;
    await resetAppData();
    window.location.reload();
  };

  const safeSetInput = (next: MortgageInput) => {
    const normalized = normalizeMortgageInput(next, defaultInput);
    setInput(normalized);
    saveToStorage(STORAGE_KEY, normalized);
  };

  const result = useMemo(() => {
    if (input.downPayment > input.propertyPrice) {
      setError('Первоначальный взнос не может быть больше стоимости недвижимости.');
      return null;
    }
    const computed = compareScenarios(input);
    if (!computed) {
      setError('Расчёт временно невозможен. Проверьте параметры кредита или сбросьте сохранённые данные.');
      return null;
    }
    setError('');
    return computed;
  }, [input]);

  return <div className="app"><header>Ипотечный планировщик <button type="button" onClick={() => void handleResetData()}>Сбросить данные</button></header><main>
    <aside><MortgageInputForm input={input} onChange={safeSetInput} error={error} /></aside>
    <section className="results">{result ? <>
      <ResultSummary result={result} input={input} autoScenario={autoScenario} setAutoScenario={setAutoScenario} />
      <PaymentCalendar schedule={result.withPrepayments.schedule} />
      <DebtChart schedule={result.withPrepayments.schedule} />
      <InterestPrincipalChart schedule={result.withPrepayments.schedule} />
      <PaymentTable schedule={result.withPrepayments.schedule} prepayments={input.prepayments} />
    </> : <div className="panel"><p>Расчёт временно невозможен. Проверьте параметры кредита или сбросьте сохранённые данные.</p><p>Введите корректные параметры или сбросьте сохранённые данные.</p><button type="button" onClick={() => void handleResetData()}>Сбросить данные</button></div>}</section>
  </main></div>;
}

export default App;
