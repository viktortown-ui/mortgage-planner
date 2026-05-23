import { useEffect, useMemo, useState } from 'react';
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
import { STORAGE_KEY } from './shared/resetAppData';
import { refreshApplication, resetApplicationData } from './shared/appMaintenance';
import './styles/global.css';

const THEME_KEY = 'mortgage-planner-theme';
const defaultInput: MortgageInput = { propertyPrice: 10000000, downPayment: 2000000, loanAmount: 8000000, annualRate: 12, termYears: 20, firstPaymentDate: '2026-06-01', paymentType: 'annuity', prepayments: [] };
const defaultAuto: AutoScenarioSettings = { amount: 0, frequency: 'monthly', mode: 'reduceTerm' };

function App() {
  const [input, setInput] = useState<MortgageInput>(() => loadFromStorage(STORAGE_KEY, defaultInput));
  const [autoScenario, setAutoScenario] = useState<AutoScenarioSettings>(defaultAuto);
  const [error, setError] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'));

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    saveToStorage(THEME_KEY, theme);
  }, [theme]);

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

  const isDebug = useMemo(() => new URLSearchParams(window.location.search).get('debug') === '1' || import.meta.env.DEV, []);

  const handleReset = async () => {
    const shouldReset = window.confirm('Сбросить сохранённые параметры ипотечного планировщика?');
    if (!shouldReset) return;
    await resetApplicationData(STORAGE_KEY);
  };

  return <div className="app"><header className="app-header">Ипотечный планировщик</header><main className="layout">
    <aside className="left-col">
      <MortgageInputForm input={input} onChange={safeSetInput} error={error} />
      {result && <PaymentCalendar schedule={result.withPrepayments.schedule} prepayments={input.prepayments} />}
      <div className="panel">
        <h3>Управление</h3>
        <div className="controls-stack">
          <button type="button" onClick={() => void refreshApplication()}>Обновить приложение</button>
          <button type="button" onClick={() => void handleReset()}>Сбросить данные</button>
          <div className="theme-switch"><span>Тема</span><div><button className={theme === 'light' ? 'active-switch' : ''} type="button" onClick={() => setTheme('light')}>Светлая</button><button className={theme === 'dark' ? 'active-switch' : ''} type="button" onClick={() => setTheme('dark')}>Тёмная</button></div></div>
        </div>
      </div>
      {isDebug && <div className="panel debug"><h3>Диагностика</h3><ul><li>propertyPrice: {input.propertyPrice}</li><li>downPayment: {input.downPayment}</li><li>loanAmount: {input.loanAmount}</li><li>annualRate: {input.annualRate}</li><li>termYears: {input.termYears}</li><li>firstPaymentDate: {input.firstPaymentDate}</li><li>paymentType: {input.paymentType}</li><li>prepayments count: {input.prepayments.length}</li><li>schedule length: {result?.withPrepayments.schedule.length ?? 0}</li><li>closingDate: {result?.withPrepayments.summary.closingDate ?? '—'}</li><li>totalInterest: {result?.withPrepayments.summary.totalInterest ?? 0}</li></ul></div>}
    </aside>
    <section className="results">{result ? <>
      <ResultSummary result={result} input={input} autoScenario={autoScenario} setAutoScenario={setAutoScenario} />
      <DebtChart schedule={result.withPrepayments.schedule} />
      <InterestPrincipalChart schedule={result.withPrepayments.schedule} />
      <PaymentTable schedule={result.withPrepayments.schedule} prepayments={input.prepayments} />
    </> : <div className="panel"><p>{error || 'Расчёт временно невозможен.'}</p></div>}</section>
  </main></div>;
}

export default App;
