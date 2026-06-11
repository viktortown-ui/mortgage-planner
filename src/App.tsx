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
import { buildMortgageViewModel, type SmartScenarioInput, type StrategyStartMode, type StrategyStartSettings } from './core/mortgage/viewModel';
import { runPrepaymentDiagnostics } from './core/mortgage/prepaymentDiagnostics';
import { formatMoney } from './shared/formatMoney';
import { MoneyInput } from './shared/ui/MoneyInput';
import { DateInput } from './shared/ui/DateInput';
import { formatDate } from './shared/formatDate';
import { Icon } from './shared/ui/Icon';
import './styles/global.css';

const defaultInput: MortgageInput = { propertyPrice: 10000000, downPayment: 2000000, loanAmount: 8000000, annualRate: 12, termYears: 20, firstPaymentDate: '2026-06-01', paymentType: 'annuity', prepayments: [], insuranceRules: [], incomeMonthly: undefined };
const defaultAuto: AutoScenarioSettings = { amount: 0, frequency: 'monthly', mode: 'reduceTerm' };
const defaultSmart: SmartScenarioInput[] = [
  { id: 'A', amount: 0, frequency: 'monthly', mode: 'reduceTerm' },
  { id: 'B', amount: 0, frequency: 'quarterly', mode: 'reduceTerm' },
  { id: 'C', amount: 0, frequency: 'annual', mode: 'reducePayment' },
];
const defaultStrategyStart: StrategyStartSettings = { mode: 'currentSnapshot' };

type ScenarioSectionProps = {
  results: ReturnType<typeof buildMortgageViewModel>['smartScenarioResults'];
  scenarios: SmartScenarioInput[];
  setScenarios: Dispatch<SetStateAction<SmartScenarioInput[]>>;
  strategyStart: StrategyStartSettings;
  setStrategyStart: Dispatch<SetStateAction<StrategyStartSettings>>;
  startPoint: ReturnType<typeof buildMortgageViewModel>['strategyStartPoint'];
};

type DesktopTab = 'overview' | 'schedule' | 'scenarios';
type MobileTab = 'overview' | 'input' | 'charts' | 'scenarios' | 'table';

const frequencyLabels: Record<SmartScenarioInput['frequency'], string> = {
  monthly: 'каждый месяц',
  quarterly: 'раз в 3 месяца',
  semiAnnual: 'раз в 6 месяцев',
  annual: 'раз в год',
};

type UserObjective = 'interest' | 'payment' | 'balance' | 'risk';

const objectiveLabels: Record<UserObjective, string> = {
  interest: 'Максимально сэкономить проценты',
  payment: 'Снизить ежемесячный платёж',
  balance: 'Найти баланс',
  risk: 'Снизить риск перегруза',
};

function formatLoad(value?: number) {
  return value === undefined ? '—' : `${Math.round(value * 100)}%`;
}

function loadZone(value?: number) {
  if (value === undefined) return 'Доход не указан';
  if (value < 0.3) return 'зелёная зона';
  if (value < 0.4) return 'жёлтая зона';
  if (value < 0.5) return 'оранжевая зона';
  return 'красная зона';
}

function maxByReady(
  ready: ReturnType<typeof buildMortgageViewModel>['smartScenarioResults'],
  getValue: (item: ReturnType<typeof buildMortgageViewModel>['smartScenarioResults'][number]) => number,
) {
  return ready.toSorted((a, b) => getValue(b) - getValue(a))[0];
}

function ScenarioSection({ results, scenarios, setScenarios, strategyStart, setStrategyStart, startPoint }: ScenarioSectionProps) {
  const [objective, setObjective] = useState<UserObjective>('balance');
  const ready = results.filter((item) => item.result);
  const bestInterest = maxByReady(ready, (item) => item.result?.interestSavings ?? 0);
  const bestPayment = maxByReady(ready, (item) => item.result?.paymentMetrics?.monthlyPaymentReduction ?? 0);
  const bestBalance = maxByReady(ready, (item) => item.result?.paymentMetrics?.strategyObjectiveScores.balanceScore ?? 0);
  const highlighted = objective === 'interest' ? bestInterest : objective === 'payment' || objective === 'risk' ? bestPayment : bestBalance;
  const startModeLabels: Record<StrategyStartMode, string> = { loanStart: 'С начала кредита', currentSnapshot: 'С текущего момента', customDate: 'С выбранной даты' };
  const startWarnings = Array.from(new Set(results.flatMap((item) => item.warnings)));
  const onModeChange = (mode: StrategyStartMode) => setStrategyStart((current) => ({ ...current, mode }));
  const bottomText = highlighted?.result ? objective === 'interest'
    ? `Лучшая по экономии: ${highlighted.id} — срезает ${formatMoney(highlighted.result.interestSavings)} будущих процентов и закрывает кредит на ${Math.max(0, highlighted.result.monthsSaved)} мес. раньше.`
    : objective === 'payment' || objective === 'risk'
      ? `Лучшая по снижению платежа: ${highlighted.id} — уменьшает ежемесячную нагрузку примерно на ${formatMoney(highlighted.result.paymentMetrics?.monthlyPaymentReduction ?? 0)}/мес. и снижает долю платежа в доходе с ${formatLoad(highlighted.result.paymentMetrics?.incomeLoadBefore)} до ${formatLoad(highlighted.result.paymentMetrics?.incomeLoadAfter)}.`
      : `Лучший баланс: ${highlighted.id} — заметно снижает проценты, но не перегружает ежемесячный бюджет.`
    : '';

  return (
    <div className="panel section scenario-section">
      <div className="section-heading"><Icon name="chart" /><div><h3>Умное досрочное погашение</h3><p>Сравнение с будущим планом без новой стратегии. Прошедшие платежи не пересчитываются.</p></div></div>
      <div className="objective-switch"><strong>Что для вас важнее?</strong><div>{(Object.entries(objectiveLabels) as Array<[UserObjective, string]>).map(([value, label]) => <button key={value} type="button" className={objective === value ? 'active-switch' : ''} onClick={() => setObjective(value)}>{label}</button>)}</div></div>
      <div className="strategy-badges">
        {bestInterest?.result ? <span>Лучшая по экономии: <b>{bestInterest.id}</b></span> : null}
        {bestPayment?.result ? <span>Лучшая по снижению платежа: <b>{bestPayment.id}</b></span> : null}
        {bestBalance?.result ? <span>Лучший баланс: <b>{bestBalance.id}</b></span> : null}
      </div>
      <div className="strategy-start-controls">
        <label>От какой точки считать стратегию?<select value={strategyStart.mode} onChange={(event) => onModeChange(event.target.value as StrategyStartMode)}><option value="loanStart">С начала кредита</option><option value="currentSnapshot">С текущего момента</option><option value="customDate">С выбранной даты</option></select></label>
        {strategyStart.mode === 'customDate' ? <label>Дата старта стратегии<DateInput value={strategyStart.customDate ?? startPoint?.strategyDate ?? ''} onValueChange={(customDate) => setStrategyStart((current) => ({ ...current, customDate }))} /></label> : null}
      </div>
      {startPoint ? <div className="strategy-start-card"><h4>Точка старта стратегии</h4><p>Стратегия считается с {formatDate(startPoint.strategyDate)}. На эту дату остаток тела кредита: {formatMoney(startPoint.remainingPrincipal)}. Прошлая история не меняется.</p><dl><div><dt>Режим расчёта</dt><dd>{startModeLabels[startPoint.mode]}</dd></div><div><dt>Дата старта стратегии</dt><dd>{formatDate(startPoint.strategyDate)}</dd></div><div><dt>Остаток тела кредита</dt><dd>{formatMoney(startPoint.remainingPrincipal)}</dd></div><div><dt>Платежей уже прошло</dt><dd>{startPoint.elapsedPayments}</dd></div><div><dt>Процентов уже оплачено</dt><dd>{formatMoney(startPoint.paidInterest)}</dd></div><div><dt>Досрочно уже внесено</dt><dd>{formatMoney(startPoint.paidPrepayments)}</dd></div></dl><small>Стратегия применяется только к оставшемуся долгу.</small></div> : null}
      {startWarnings.length ? <div className="scenario-warnings">{startWarnings.map((warning) => <p key={warning}>{warning}</p>)}</div> : null}
      {scenarios.every((scenario) => scenario.amount <= 0) ? <p className="muted-note">Введите сумму, чтобы увидеть эффект.</p> : null}
      <div className="scenario-grid">
        {scenarios.map((scenario, idx) => {
          const scenarioResult = results[idx]?.result;
          const metrics = scenarioResult?.paymentMetrics;
          const isHighlighted = highlighted?.id === scenario.id && Boolean(scenarioResult);
          const isReducePayment = scenario.mode === 'reducePayment';
          return (
            <div key={scenario.id} className={`scenario-card scenario-card--${scenario.mode}${isHighlighted ? ' is-best' : ''}`}>
              <div className="scenario-card__head"><h4>Стратегия {scenario.id}</h4>{isHighlighted ? <span>{objectiveLabels[objective]}</span> : <span>{isReducePayment ? 'меньше платёж' : 'меньше срок'}</span>}</div>
              <div className="scenario-card__inputs"><label>Сумма<MoneyInput value={scenario.amount} onValueChange={(amount) => { setScenarios((items) => items.map((item, i) => i === idx ? { ...item, amount } : item)); }} /></label><label>Частота<select value={scenario.frequency} onChange={(e) => setScenarios((items) => items.map((item, i) => i === idx ? { ...item, frequency: e.target.value as SmartScenarioInput['frequency'] } : item))}>{Object.entries(frequencyLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Режим<select value={scenario.mode} onChange={(e) => setScenarios((items) => items.map((item, i) => i === idx ? { ...item, mode: e.target.value as SmartScenarioInput['mode'] } : item))}><option value="reduceTerm">уменьшать срок</option><option value="reducePayment">уменьшать платёж</option></select></label></div>
              {scenarioResult && metrics ? <>
                <div className="scenario-block"><h5>Деньги банку</h5><div className="scenario-metrics"><div><span>Будущая переплата процентов</span><strong>{formatMoney(scenarioResult.withPrepayments.summary.totalInterest)}</strong></div><div><span>Экономия будущих процентов</span><strong>{formatMoney(scenarioResult.interestSavings)}</strong></div></div></div>
                <div className="scenario-block"><h5>Срок</h5><div className="scenario-metrics"><div><span>Дата закрытия</span><strong>{scenarioResult.withPrepayments.summary.closingDate}</strong></div><div><span>{isReducePayment ? 'Срок не главный результат' : 'Сокращение срока'}</span><strong>{Math.max(0, scenarioResult.monthsSaved)} мес.</strong></div></div></div>
                <div className="scenario-block"><h5>Ежемесячная нагрузка</h5><div className="scenario-metrics"><div><span>Платёж сейчас</span><strong>{formatMoney(metrics.baselineMonthlyPayment)}</strong></div><div><span>Платёж после стратегии</span><strong>{formatMoney(metrics.firstPaymentAfterStrategy)}</strong></div><div><span>Средний платёж 12 мес.</span><strong>{formatMoney(metrics.averagePaymentNext12Months)}</strong></div><div><span>Средний платёж до конца</span><strong>{formatMoney(metrics.averagePaymentRemaining)}</strong></div><div><span>Снижение платежа</span><strong>{formatMoney(metrics.monthlyPaymentReduction)}/мес.</strong><small>{metrics.monthlyPaymentReductionPercent}%</small></div><div><span>Освободится за год</span><strong>{formatMoney(metrics.annualFreedCashflow)}</strong></div></div><div className="load-indicator"><b>Месячная нагрузка</b>{metrics.incomeLoadBefore === undefined ? <span>Введите доход, чтобы оценить, насколько легче станет ежемесячная нагрузка.</span> : <span>Было: {formatLoad(metrics.incomeLoadBefore)} · стало: {formatLoad(metrics.incomeLoadAfter)} · свободнее: +{formatMoney(metrics.monthlyPaymentReduction)}/мес. · {loadZone(metrics.incomeLoadAfter)}</span>}</div></div>
                <div className="life-effect"><h5>Жизненный эффект</h5>{isReducePayment ? <><p>Платёж ниже на {formatMoney(metrics.monthlyPaymentReduction)}/мес.</p><p>За год освободится примерно {formatMoney(metrics.annualFreedCashflow)}.</p><p>Нагрузка на доход снизится с {formatLoad(metrics.incomeLoadBefore)} до {formatLoad(metrics.incomeLoadAfter)}.</p><p>Подходит, если цель — снизить ежемесячное давление и сохранить запас.</p></> : <><p>Закрытие быстрее на {Math.max(0, scenarioResult.monthsSaved)} мес.</p><p>Экономия процентов: {formatMoney(scenarioResult.interestSavings)}</p><p>Подходит, если цель — быстрее выйти из долга.</p></>}<strong>{metrics.lifeEffectLabel}</strong></div>
              </> : <small className="muted-note">{results[idx]?.warnings.at(-1) ?? 'Введите сумму, чтобы увидеть эффект.'}</small>}
            </div>
          );
        })}
      </div>
      {bottomText ? <div className="winner-card desktop-winner"><strong>{bottomText}</strong><span>Меньшая переплата — не всегда лучшая стратегия для жизни. Иногда снижение платежа важнее, если нужен запас и спокойствие.</span></div> : null}
    </div>
  );
}

function App() {
  const [input, setInput] = useState<MortgageInput>(() => loadFromStorage(STORAGE_KEY, defaultInput));
  const [autoScenario] = useState<AutoScenarioSettings>(defaultAuto);
  const [smartScenarios, setSmartScenarios] = useState<SmartScenarioInput[]>(defaultSmart);
  const [strategyStart, setStrategyStart] = useState<StrategyStartSettings>(defaultStrategyStart);
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
  const viewModel = useMemo(() => buildMortgageViewModel(normalizedInput, autoScenario, smartScenarios, strategyStart), [normalizedInput, autoScenario, smartScenarios, strategyStart]);
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
          ? <ScenarioSection results={viewModel.smartScenarioResults} scenarios={smartScenarios} setScenarios={setSmartScenarios} strategyStart={strategyStart} setStrategyStart={setStrategyStart} startPoint={viewModel.strategyStartPoint} />
          : <PaymentTable schedule={snapshot.tableData} prepayments={normalizedInput.prepayments} />;

  return <div className="app">
    <header className="app-header desktop-header"><div className="brand"><Icon name="home" /><div><strong>Ипотечный планировщик</strong><span>единый расчёт · понятные сценарии</span></div></div><div className="header-actions"><button type="button" onClick={toggleTheme}>{theme === 'light' ? 'Тёмная тема' : 'Светлая тема'}</button><details className="action-menu" ref={actionMenuRef}><summary>Действия</summary><div><button type="button" onClick={() => { actionMenuRef.current?.removeAttribute('open'); void refreshApplication(); }}>Обновить приложение</button><button type="button" className="danger-action" onClick={() => { actionMenuRef.current?.removeAttribute('open'); void resetApplicationData(STORAGE_KEY); }}>Сбросить данные</button></div></details></div></header>

    <main className="layout desktop-shell"><aside className="left-col"><MortgageInputForm input={normalizedInput} onChange={safeSetInput} error={error} />
      {snapshot && <section className="panel input-card compact-calendar"><div className="section-heading"><Icon name="calendar" /><div><h3>Календарь</h3><p>Платежи, досрочки и страховки в одном месячном виде.</p></div></div><PaymentCalendar schedule={snapshot.calendarEvents} prepayments={normalizedInput.prepayments} insuranceEvents={snapshot.scenarioSummary.active.insuranceEvents} /></section>}
    </aside><section className="results"><div className="panel tabs-panel"><div className="tabs"><button className={tab === 'overview' ? 'active-switch' : ''} onClick={() => setTab('overview')}>Обзор</button><button className={tab === 'schedule' ? 'active-switch' : ''} onClick={() => setTab('schedule')}>Графики и поток платежей</button><button className={tab === 'scenarios' ? 'active-switch' : ''} onClick={() => setTab('scenarios')}>Сценарии</button></div></div>
      {!result || !snapshot ? <div className="panel"><p>{error}</p></div> : tab === 'overview' ? <ResultSummary snapshot={snapshot} input={normalizedInput} /> : tab === 'schedule' ? <><DebtChart schedule={snapshot.chartsData} /><InterestPrincipalChart schedule={snapshot.chartsData} /><PaymentTable schedule={snapshot.tableData} prepayments={normalizedInput.prepayments} /></> : <ScenarioSection results={viewModel.smartScenarioResults} scenarios={smartScenarios} setScenarios={setSmartScenarios} strategyStart={strategyStart} setStrategyStart={setStrategyStart} startPoint={viewModel.strategyStartPoint} />}
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
