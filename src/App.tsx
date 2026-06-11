import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { MortgageInput } from './core/mortgage/types';
import type { AutoScenarioSettings } from './core/mortgage/scenarioInsights';
import { MortgageInputForm } from './features/calculator/MortgageInputForm';
import { ResultSummary } from './features/calculator/ResultSummary';
import { PaymentCalendar } from './features/calendar/PaymentCalendar';
import { PaymentTable } from './features/schedule/PaymentTable';
import { DebtChart } from './features/charts/DebtChart';
import { InterestPrincipalChart } from './features/charts/InterestPrincipalChart';
import { MobileInputAccordion } from './features/mobile/MobileInputAccordion';
import { loadFromStorage, saveToStorage } from './shared/storage';
import { applyTheme, getStoredTheme, setStoredTheme, type AppTheme } from './shared/theme';
import { normalizeMortgageInput } from './shared/normalizeMortgageInput';
import { STORAGE_KEY } from './shared/resetAppData';
import { refreshApplication, resetApplicationData } from './shared/appMaintenance';
import { buildMortgageViewModel, type SmartScenarioInput } from './core/mortgage/viewModel';
import { runPrepaymentDiagnostics } from './core/mortgage/prepaymentDiagnostics';
import { formatMoney } from './shared/formatMoney';
import { MoneyInput } from './shared/ui/MoneyInput';
import { Icon } from './shared/ui/Icon';
import './styles/global.css';

const defaultInput: MortgageInput = { propertyPrice: 10000000, downPayment: 2000000, loanAmount: 8000000, annualRate: 12, termYears: 20, firstPaymentDate: '2026-06-01', paymentType: 'annuity', prepayments: [], insuranceRules: [], incomeMonthly: undefined };
const defaultAuto: AutoScenarioSettings = { amount: 0, frequency: 'monthly', mode: 'reduceTerm' };
const defaultSmart: SmartScenarioInput[] = [
  { id: 'A', amount: 0, frequency: 'monthly', mode: 'reduceTerm' },
  { id: 'B', amount: 0, frequency: 'quarterly', mode: 'reduceTerm' },
  { id: 'C', amount: 0, frequency: 'annual', mode: 'reducePayment' },
];

type ScenarioSectionProps = {
  results: ReturnType<typeof buildMortgageViewModel>['smartScenarioResults'];
  scenarios: SmartScenarioInput[];
  setScenarios: Dispatch<SetStateAction<SmartScenarioInput[]>>;
};

type DesktopTab = 'overview' | 'schedule' | 'scenarios';
type MobileTab = 'overview' | 'input' | 'charts' | 'scenarios' | 'table';

const frequencyLabels: Record<SmartScenarioInput['frequency'], string> = {
  monthly: 'каждый месяц',
  quarterly: 'раз в 3 месяца',
  semiAnnual: 'раз в 6 месяцев',
  annual: 'раз в год',
};

function ScenarioSection({ results, scenarios, setScenarios }: ScenarioSectionProps) {
  const ready = results.filter((item) => item.result);
  const winner = ready.toSorted((a, b) => (b.result?.interestSavings ?? 0) - (a.result?.interestSavings ?? 0))[0];

  return (
    <div className="panel section scenario-section">
      <div className="section-heading"><Icon name="chart" /><div><h3>Умное досрочное погашение</h3><p>Сравните A / B / C по тем же правилам текущего расчёта.</p></div></div>
      {winner?.result ? <div className="winner-card mobile-winner"><strong>Лучшая стратегия: {winner.id}</strong><span>Экономия {formatMoney(winner.result.interestSavings)} · минус {winner.result.monthsSaved} мес.</span></div> : null}
      {scenarios.every((scenario) => scenario.amount <= 0) ? <p className="muted-note">Введите параметры стратегии, чтобы сравнить варианты досрочного погашения.</p> : null}
      <div className="scenario-grid">
        {scenarios.map((scenario, idx) => {
          const scenarioResult = results[idx]?.result;
          const averageInsurance = scenarioResult ? scenarioResult.withPrepayments.summary.totalInsuranceCost / Math.max(1, scenarioResult.withPrepayments.schedule.length) : 0;
          const recommendedIncome = scenarioResult ? ((scenarioResult.withPrepayments.monthlyPayment ?? 0) + averageInsurance) / 0.3 : 0;
          const apartmentCost = scenarioResult ? scenarioResult.withPrepayments.summary.totalRealCost / Math.max(1, scenarioResult.withPrepayments.schedule[0]?.remainingDebt ?? 1) : 0;
          const isWinner = winner?.id === scenario.id && Boolean(scenarioResult);

          return (
            <div key={scenario.id} className={`scenario-card${isWinner ? ' is-best' : ''}`}>
              <div className="scenario-card__head">
                <h4>Стратегия {scenario.id}</h4>
                {isWinner ? <span>Лучший эффект</span> : null}
              </div>
              <div className="scenario-card__inputs">
                <label>Сумма<MoneyInput value={scenario.amount} onValueChange={(amount) => { setScenarios((items) => items.map((item, i) => i === idx ? { ...item, amount } : item)); }} /></label>
                <label>Частота<select value={scenario.frequency} onChange={(e) => setScenarios((items) => items.map((item, i) => i === idx ? { ...item, frequency: e.target.value as SmartScenarioInput['frequency'] } : item))}>{Object.entries(frequencyLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <label>Режим<select value={scenario.mode} onChange={(e) => setScenarios((items) => items.map((item, i) => i === idx ? { ...item, mode: e.target.value as SmartScenarioInput['mode'] } : item))}><option value="reduceTerm">уменьшать срок</option><option value="reducePayment">уменьшать платёж</option></select></label>
              </div>
              {scenarioResult ? (
                <div className="scenario-metrics">
                  <div><span>Переплата</span><strong>{formatMoney(scenarioResult.withPrepayments.summary.totalInterest)}</strong></div>
                  <div><span>Экономия</span><strong>{formatMoney(scenarioResult.interestSavings)}</strong></div>
                  <div><span>Срок</span><strong>{scenarioResult.withPrepayments.schedule.length} мес.</strong></div>
                  <div><span>Дата закрытия</span><strong>{scenarioResult.withPrepayments.summary.closingDate}</strong></div>
                  <div><span>Рекомендуемый доход</span><strong>{formatMoney(recommendedIncome)}</strong></div>
                  <div><span>Стоимость в квартирах</span><strong>{apartmentCost.toFixed(2)}×</strong></div>
                </div>
              ) : <small className="muted-note">Введите сумму для расчёта.</small>}
            </div>
          );
        })}
      </div>
      {winner?.result ? <div className="winner-card desktop-winner"><strong>Лучшая стратегия: {winner.id}</strong><span>Она экономит {formatMoney(winner.result.interestSavings)} и снимает {winner.result.monthsSaved} мес. срока относительно базового графика.</span></div> : null}
    </div>
  );
}

function App() {
  const [input, setInput] = useState<MortgageInput>(() => loadFromStorage(STORAGE_KEY, defaultInput));
  const [autoScenario] = useState<AutoScenarioSettings>(defaultAuto);
  const [smartScenarios, setSmartScenarios] = useState<SmartScenarioInput[]>(defaultSmart);
  const [tab, setTab] = useState<DesktopTab>('overview');
  const [mobileTab, setMobileTab] = useState<MobileTab>('overview');
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);
  const [theme, setTheme] = useState<AppTheme>(() => getStoredTheme());
  const actionMenuRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => { applyTheme(theme); setStoredTheme(theme); }, [theme]);

  const toggleTheme = () => setTheme((current) => current === 'light' ? 'dark' : 'light');
  const safeSetInput = (next: MortgageInput) => {
    const normalized = normalizeMortgageInput(next, defaultInput);
    setInput(normalized);
    saveToStorage(STORAGE_KEY, normalized);
  };

  const normalizedInput = useMemo(() => normalizeMortgageInput(input, defaultInput), [input]);
  const viewModel = useMemo(() => buildMortgageViewModel(normalizedInput, autoScenario, smartScenarios), [normalizedInput, autoScenario, smartScenarios]);
  const result = viewModel.comparison;
  const snapshot = viewModel.snapshot;

  const error = useMemo(() => {
    if (normalizedInput.downPayment > normalizedInput.propertyPrice) return 'Первоначальный взнос не может быть больше стоимости недвижимости.';
    if (!result) return 'Расчёт временно невозможен. Проверьте параметры кредита.';
    return '';
  }, [normalizedInput, result]);

  const isDebug = useMemo(() => new URLSearchParams(window.location.search).get('debug') === '1' || import.meta.env.DEV, []);
  const diagnostics = useMemo(() => runPrepaymentDiagnostics({ ...defaultInput, firstPaymentDate: '2023-08-10' }), []);
  const mobileSummary = snapshot ? [
    { label: 'Остаток тела', value: formatMoney(snapshot.currentSnapshot.currentDebt) },
    { label: 'Ещё выплатить', value: formatMoney(snapshot.currentSnapshot.remainingTotalCashflow) },
    { label: 'Экономия', value: formatMoney(snapshot.scenarioSummary.interestSavings) },
  ] : [];
  const mobileContent = !result || !snapshot ? <div className="panel"><p>{error}</p></div> : mobileTab === 'overview'
    ? <ResultSummary snapshot={snapshot} input={normalizedInput} />
    : mobileTab === 'input'
      ? <MobileInputAccordion input={normalizedInput} onChange={safeSetInput} error={error} snapshot={snapshot} />
      : mobileTab === 'charts'
        ? <><DebtChart schedule={snapshot.chartsData} /><InterestPrincipalChart schedule={snapshot.chartsData} /></>
        : mobileTab === 'scenarios'
          ? <ScenarioSection results={viewModel.smartScenarioResults} scenarios={smartScenarios} setScenarios={setSmartScenarios} />
          : <PaymentTable schedule={snapshot.tableData} prepayments={normalizedInput.prepayments} />;

  return <div className="app">
    <header className="app-header desktop-header"><div className="brand"><Icon name="home" /><div><strong>Ипотечный планировщик</strong><span>единый расчёт · понятные сценарии</span></div></div><div className="header-actions"><button type="button" onClick={toggleTheme}>{theme === 'light' ? 'Тёмная тема' : 'Светлая тема'}</button><details className="action-menu" ref={actionMenuRef}><summary>Действия</summary><div><button type="button" onClick={() => { actionMenuRef.current?.removeAttribute('open'); void refreshApplication(); }}>Обновить приложение</button><button type="button" className="danger-action" onClick={() => { actionMenuRef.current?.removeAttribute('open'); void resetApplicationData(STORAGE_KEY); }}>Сбросить данные</button></div></details></div></header>

    <main className="layout desktop-shell"><aside className="left-col"><MortgageInputForm input={normalizedInput} onChange={safeSetInput} error={error} />
      {snapshot && <section className="panel input-card compact-calendar"><div className="section-heading"><Icon name="calendar" /><div><h3>Календарь</h3><p>Платежи, досрочки и страховки в одном месячном виде.</p></div></div><PaymentCalendar schedule={snapshot.calendarEvents} prepayments={normalizedInput.prepayments} insuranceEvents={snapshot.scenarioSummary.active.insuranceEvents} /></section>}
    </aside><section className="results"><div className="panel tabs-panel"><div className="tabs"><button className={tab === 'overview' ? 'active-switch' : ''} onClick={() => setTab('overview')}>Обзор</button><button className={tab === 'schedule' ? 'active-switch' : ''} onClick={() => setTab('schedule')}>Графики и поток платежей</button><button className={tab === 'scenarios' ? 'active-switch' : ''} onClick={() => setTab('scenarios')}>Сценарии</button></div></div>
      {!result || !snapshot ? <div className="panel"><p>{error}</p></div> : tab === 'overview' ? <ResultSummary snapshot={snapshot} input={normalizedInput} /> : tab === 'schedule' ? <><DebtChart schedule={snapshot.chartsData} /><InterestPrincipalChart schedule={snapshot.chartsData} /><PaymentTable schedule={snapshot.tableData} prepayments={normalizedInput.prepayments} /></> : <ScenarioSection results={viewModel.smartScenarioResults} scenarios={smartScenarios} setScenarios={setSmartScenarios} />}
      {isDebug && <div className="panel debug"><h3>Диагностика</h3><ul><li>propertyPrice: {normalizedInput.propertyPrice}</li><li>downPayment: {normalizedInput.downPayment}</li><li>loanAmount: {normalizedInput.loanAmount}</li><li>annualRate: {normalizedInput.annualRate}</li><li>termYears: {normalizedInput.termYears}</li><li>firstPaymentDate: {normalizedInput.firstPaymentDate}</li><li>paymentType: {normalizedInput.paymentType}</li><li>prepayments count: {normalizedInput.prepayments.length}</li><li>schedule length: {result?.withPrepayments.schedule.length ?? 0}</li><li>closingDate: {result?.withPrepayments.summary.closingDate ?? '—'}</li><li>totalInterest: {result?.withPrepayments.summary.totalInterest ?? 0}</li><li>hasPrepaymentEffect: {String(viewModel.hasPrepaymentEffect)}</li><li>firstScheduleDate: {result?.withPrepayments.schedule[0]?.date ?? '—'}</li><li>diagnostics: {diagnostics.map((d) => `${d.id}:${d.passed ? 'ok' : 'fail'}`).join(', ')}</li></ul></div>}
    </section></main>

    <section className="mobile-shell" aria-label="Мобильная версия">
      <header className="mobile-header"><div><strong>Ипотечный планировщик</strong><span>Кредит, досрочки, страховки</span></div><div className="mobile-header__actions"><button type="button" aria-label="Сменить тему" onClick={toggleTheme}>{theme === 'dark' ? '☀️' : '🌙'}</button><button type="button" onClick={() => setIsActionSheetOpen(true)}>Действия</button></div></header>
      {snapshot ? <div className="mobile-sticky-summary" aria-label="Главные итоги">{mobileSummary.map((item) => <div key={item.label}><span>{item.label}</span><strong>{item.value}</strong></div>)}</div> : null}
      <main className="mobile-content">{mobileContent}{isDebug ? <div className="panel debug"><h3>Диагностика</h3><p>schedule length: {result?.withPrepayments.schedule.length ?? 0}</p></div> : null}</main>
      <nav className="mobile-bottom-nav" aria-label="Основная мобильная навигация">
        <button type="button" className={mobileTab === 'overview' ? 'active-switch' : ''} onClick={() => setMobileTab('overview')}><span aria-hidden="true">⌂</span>Обзор</button>
        <button type="button" className={mobileTab === 'input' ? 'active-switch' : ''} onClick={() => setMobileTab('input')}><span aria-hidden="true">✎</span>Ввод</button>
        <button type="button" className={mobileTab === 'charts' ? 'active-switch' : ''} onClick={() => setMobileTab('charts')}><span aria-hidden="true">▦</span>Графики</button>
        <button type="button" className={mobileTab === 'scenarios' ? 'active-switch' : ''} onClick={() => setMobileTab('scenarios')}><span aria-hidden="true">◇</span>Сценарии</button>
        <button type="button" className={mobileTab === 'table' ? 'active-switch' : ''} onClick={() => setMobileTab('table')}><span aria-hidden="true">☷</span>Таблица</button>
      </nav>
      {isActionSheetOpen ? <div className="mobile-sheet-backdrop" role="presentation" onClick={() => setIsActionSheetOpen(false)}><section className="mobile-action-sheet" role="dialog" aria-modal="true" aria-label="Действия" onClick={(event) => event.stopPropagation()}><div className="mobile-sheet-handle" /><h2>Действия</h2><button type="button" onClick={() => { setIsActionSheetOpen(false); void refreshApplication(); }}>Обновить приложение</button><button type="button" onClick={toggleTheme}>Тема: {theme === 'dark' ? 'светлая' : 'тёмная'}</button><button type="button" className="danger-action" onClick={() => { setIsActionSheetOpen(false); void resetApplicationData(STORAGE_KEY); }}>Сбросить данные</button><button type="button" onClick={() => setIsActionSheetOpen(false)}>Закрыть</button></section></div> : null}
    </section>
  </div>;
}

export default App;
