import { useEffect, useMemo, useState } from 'react';
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
import { buildMortgageViewModel, type SmartScenarioInput } from './core/mortgage/viewModel';
import { runPrepaymentDiagnostics } from './core/mortgage/prepaymentDiagnostics';
import { formatMoney } from './shared/formatMoney';
import { MoneyInput } from './shared/ui/MoneyInput';
import './styles/global.css';

const THEME_KEY = 'mortgage-planner-theme';
const defaultInput: MortgageInput = { propertyPrice: 10000000, downPayment: 2000000, loanAmount: 8000000, annualRate: 12, termYears: 20, firstPaymentDate: '2026-06-01', paymentType: 'annuity', prepayments: [] };
const defaultAuto: AutoScenarioSettings = { amount: 0, frequency: 'monthly', mode: 'reduceTerm' };
const defaultSmart: SmartScenarioInput[] = [
  { id: 'A', amount: 0, frequency: 'monthly', mode: 'reduceTerm' },
  { id: 'B', amount: 0, frequency: 'quarterly', mode: 'reduceTerm' },
  { id: 'C', amount: 0, frequency: 'annual', mode: 'reducePayment' },
];

function App() {
  const [input, setInput] = useState<MortgageInput>(() => loadFromStorage(STORAGE_KEY, defaultInput));
  const [autoScenario, setAutoScenario] = useState<AutoScenarioSettings>(defaultAuto);
  const [smartScenarios, setSmartScenarios] = useState<SmartScenarioInput[]>(defaultSmart);
  const [tab, setTab] = useState<'overview' | 'schedule' | 'scenarios'>('overview');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'));

  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); saveToStorage(THEME_KEY, theme); }, [theme]);

  const safeSetInput = (next: MortgageInput) => {
    const normalized = normalizeMortgageInput(next, defaultInput);
    setInput(normalized);
    saveToStorage(STORAGE_KEY, normalized);
  };

  const normalizedInput = useMemo(() => normalizeMortgageInput(input, defaultInput), [input]);
  const viewModel = useMemo(() => buildMortgageViewModel(normalizedInput, autoScenario, smartScenarios), [normalizedInput, autoScenario, smartScenarios]);
  const result = viewModel.comparison;

  const error = useMemo(() => {
    if (normalizedInput.downPayment > normalizedInput.propertyPrice) return 'Первоначальный взнос не может быть больше стоимости недвижимости.';
    if (!result) return 'Расчёт временно невозможен. Проверьте параметры кредита.';
    return '';
  }, [normalizedInput, result]);

  const isDebug = useMemo(() => new URLSearchParams(window.location.search).get('debug') === '1' || import.meta.env.DEV, []);
  const diagnostics = useMemo(() => runPrepaymentDiagnostics({ ...defaultInput, firstPaymentDate: '2023-08-10' }), []);
  return <div className="app"><header className="app-header">Ипотечный планировщик</header><main className="layout"><aside className="left-col"><MortgageInputForm input={normalizedInput} onChange={safeSetInput} error={error} />
    {result && <PaymentCalendar schedule={result.withPrepayments.schedule} prepayments={normalizedInput.prepayments} />}
  </aside><section className="results"><div className="panel"><div className="tabs"><button className={tab === 'overview' ? 'active-switch' : ''} onClick={() => setTab('overview')}>Обзор</button><button className={tab === 'schedule' ? 'active-switch' : ''} onClick={() => setTab('schedule')}>График платежей</button><button className={tab === 'scenarios' ? 'active-switch' : ''} onClick={() => setTab('scenarios')}>Сценарии</button></div></div>
    {!result ? <div className="panel"><p>{error}</p></div> : tab === 'overview' ? <><ResultSummary result={result} input={normalizedInput} autoScenario={autoScenario} setAutoScenario={setAutoScenario} /><DebtChart schedule={result.withPrepayments.schedule} /><InterestPrincipalChart schedule={result.withPrepayments.schedule} /></> : tab === 'schedule' ? <PaymentTable schedule={result.withPrepayments.schedule} prepayments={normalizedInput.prepayments} /> : <div className="panel section"><h3>Умное досрочное погашение</h3>{smartScenarios.every((s) => s.amount <= 0) ? <p>Введите параметры стратегии, чтобы сравнить варианты досрочного погашения.</p> : null}<div className="scenario-grid">{smartScenarios.map((scenario, idx) => <div key={scenario.id} className="scenario-card"><h4>Стратегия {scenario.id}</h4><label>Сумма<MoneyInput value={scenario.amount} onValueChange={(amount) => { setSmartScenarios(smartScenarios.map((item, i) => i === idx ? { ...item, amount } : item)); }} /></label><label>Частота<select value={scenario.frequency} onChange={(e) => setSmartScenarios(smartScenarios.map((item, i) => i === idx ? { ...item, frequency: e.target.value as SmartScenarioInput['frequency'] } : item))}><option value='monthly'>каждый месяц</option><option value='quarterly'>раз в 3 месяца</option><option value='semiAnnual'>раз в 6 месяцев</option><option value='annual'>раз в год</option></select></label><label>Режим<select value={scenario.mode} onChange={(e) => setSmartScenarios(smartScenarios.map((item, i) => i === idx ? { ...item, mode: e.target.value as SmartScenarioInput['mode'] } : item))}><option value='reduceTerm'>уменьшать срок</option><option value='reducePayment'>уменьшать платёж</option></select></label><div>{viewModel.smartScenarioResults[idx]?.result ? <><div>Экономия: {formatMoney(viewModel.smartScenarioResults[idx].result?.interestSavings ?? 0)}</div><div>Сокращение срока: {viewModel.smartScenarioResults[idx].result?.monthsSaved ?? 0} мес.</div><div>Дата закрытия: {viewModel.smartScenarioResults[idx].result?.withPrepayments.summary.closingDate}</div></> : <small>Введите сумму для расчёта.</small>}</div></div>)}</div></div>}
    <div className="panel"><h3>Управление</h3><div className="controls-stack"><button type="button" onClick={() => void refreshApplication()}>Обновить приложение</button><button type="button" onClick={() => void resetApplicationData(STORAGE_KEY)}>Сбросить данные</button><div className="theme-switch"><span>Тема</span><div><button className={theme === 'light' ? 'active-switch' : ''} type="button" onClick={() => setTheme('light')}>Светлая</button><button className={theme === 'dark' ? 'active-switch' : ''} type="button" onClick={() => setTheme('dark')}>Тёмная</button></div></div></div></div>
    {isDebug && <div className="panel debug"><h3>Диагностика</h3><ul><li>propertyPrice: {normalizedInput.propertyPrice}</li><li>downPayment: {normalizedInput.downPayment}</li><li>loanAmount: {normalizedInput.loanAmount}</li><li>annualRate: {normalizedInput.annualRate}</li><li>termYears: {normalizedInput.termYears}</li><li>firstPaymentDate: {normalizedInput.firstPaymentDate}</li><li>paymentType: {normalizedInput.paymentType}</li><li>prepayments count: {normalizedInput.prepayments.length}</li><li>schedule length: {result?.withPrepayments.schedule.length ?? 0}</li><li>closingDate: {result?.withPrepayments.summary.closingDate ?? '—'}</li><li>totalInterest: {result?.withPrepayments.summary.totalInterest ?? 0}</li><li>hasPrepaymentEffect: {String(viewModel.hasPrepaymentEffect)}</li><li>firstScheduleDate: {result?.withPrepayments.schedule[0]?.date ?? '—'}</li><li>diagnostics: {diagnostics.map((d) => `${d.id}:${d.passed ? 'ok' : 'fail'}`).join(', ')}</li></ul></div>}</section></main></div>;
}

export default App;
