import { useState, type CSSProperties } from 'react';
import type { MortgageInput, MortgageSnapshot, PrepaymentMode } from '../../core/mortgage/types';
import { findBestPrepaymentMonth } from '../../core/mortgage/scenarioInsights';
import { calculatePrepaymentEffects } from '../../core/mortgage/prepaymentEffects';
import { formatMoney } from '../../shared/formatMoney';
import { Icon, type IconName } from '../../shared/ui/Icon';

const modeLabel = (mode: PrepaymentMode) => (mode === 'reduceTerm' ? 'уменьшение срока' : 'уменьшение платежа');
const durationText = (months: number) => months >= 12 ? `${Math.floor(months / 12)} г. ${months % 12} мес.` : `${months} мес.`;
const percent = (value: number) => `${Math.round(value)}%`;

type TimeMode = 'lifetime' | 'current';

function KpiCard({ icon, title, value, note, accent = 'blue' }: { icon: IconName; title: string; value: string; note?: string; accent?: 'blue' | 'green' | 'orange' | 'violet' }) {
  return <div className={`kpi-card accent-${accent}`}><div className="kpi-icon"><Icon name={icon} /></div><div><span>{title}</span><strong>{value}</strong>{note ? <small>{note}</small> : null}</div></div>;
}

function Gauge({ value, label }: { value: number; label: string }) {
  const safe = Math.max(0, Math.min(100, value));
  const fill = safe / 2;
  return <div className="mini-gauge" style={{ '--gauge-fill': `${fill}%` } as CSSProperties}><div><strong>{percent(safe)}</strong><span>{label}</span></div></div>;
}

export function ResultSummary({ snapshot, input }: { snapshot: MortgageSnapshot; input: MortgageInput }) {
  const [timeMode, setTimeMode] = useState<TimeMode>('lifetime');
  const result = snapshot.comparison;
  const active = result.withPrepayments;
  const current = snapshot.currentSnapshot;
  const firstYear = active.schedule.slice(0, 12);
  const firstYearInterest = firstYear.reduce((acc, row) => acc + row.interest, 0);
  const firstYearPrincipal = firstYear.reduce((acc, row) => acc + row.principal, 0);
  const breakPoint = active.schedule.find((row) => row.principal > row.interest);
  const bankShareLifetime = active.summary.totalPayment > 0 ? (active.summary.totalInterest / active.summary.totalPayment) * 100 : 0;
  const bankShareCurrent = current.paidTotal > 0 ? (current.paidInterest / current.paidTotal) * 100 : 0;
  const hasPrepayments = input.prepayments.some((p) => p.amount > 0);
  const bestPayment = findBestPrepaymentMonth(active.schedule);
  const averageMonthlyInsurance = active.schedule.length > 0 ? active.summary.totalInsuranceCost / active.schedule.length : 0;
  const monthlyObligation = (active.monthlyPayment ?? active.schedule[0]?.payment ?? 0) + averageMonthlyInsurance;
  const recommendedIncomeComfort = monthlyObligation / 0.3;
  const recommendedIncomeTense = monthlyObligation / 0.4;
  const incomeRatio = input.incomeMonthly && input.incomeMonthly > 0 ? monthlyObligation / input.incomeMonthly : undefined;
  const incomeZone = incomeRatio === undefined ? '' : incomeRatio <= 0.3 ? 'зелёная' : incomeRatio <= 0.4 ? 'жёлтая' : incomeRatio <= 0.5 ? 'оранжевая' : 'красная';
  const bankApartmentEquivalent = input.propertyPrice > 0 ? active.summary.totalInterest / input.propertyPrice : 0;
  const savedApartmentEquivalent = input.propertyPrice > 0 ? result.interestSavings / input.propertyPrice : 0;
  const effects = calculatePrepaymentEffects(input);
  const progress = Math.min(100, result.interestSavings > 0 ? (result.interestSavings / Math.max(1, result.baseline.summary.totalInterest)) * 100 : 0);
  const principalShare = input.loanAmount > 0 ? ((current.paidPrincipal + current.paidPrepayments) / input.loanAmount) * 100 : 0;
  const realCostScaleMax = 3;
  const realCostProgress = Math.min(100, (active.summary.realCostMultiplier / realCostScaleMax) * 100);

  return <>
    <section className="hero-summary">
      <div className="hero-copy"><p className="eyebrow">Единый снимок расчёта</p><h2>Что получилось</h2><p>Все цифры ниже взяты из одного mortgage snapshot: план на весь срок, текущее состояние и сценарная проекция не расходятся между собой.</p></div>
      <div className="hero-gauges"><Gauge value={principalShare} label="долг погашен" /><Gauge value={incomeRatio ? incomeRatio * 100 : 0} label="нагрузка" /></div>
      <div className="summary-groups">
        <KpiCard icon="home" title="Сумма кредита" value={formatMoney(input.loanAmount)} note="после первоначального взноса" />
        <KpiCard icon="calendar" title="Ежемесячный платёж" value={formatMoney(active.monthlyPayment ?? active.schedule[0]?.payment ?? 0)} note="без досрочек и страховок" />
        <KpiCard icon="calendar" title="Дата закрытия" value={snapshot.fullPlan.closingDate} note={`${snapshot.fullPlan.monthsTotal} платежей`} accent="green" />
        <KpiCard icon="percent" title="Переплата банку" value={formatMoney(snapshot.fullPlan.totalInterest)} note={`${bankShareLifetime.toFixed(1)}% регулярных платежей`} accent="orange" />
        <KpiCard icon="shield" title="Страховки" value={formatMoney(snapshot.fullPlan.totalInsuranceCost)} note="не уменьшают тело долга" accent="violet" />
        <KpiCard icon="home" title="Реальная стоимость" value={formatMoney(snapshot.fullPlan.totalRealCost)} note={`${snapshot.fullPlan.realCostMultiplier.toFixed(2)} стоимости квартиры`} accent="blue" />
        <KpiCard icon="income" title="Рекомендованный доход" value={`${formatMoney(recommendedIncomeComfort)}/мес.`} note="комфортная нагрузка до 30%" accent="green" />
        <KpiCard icon="chart" title="Текущий остаток" value={formatMoney(current.currentDebt)} note={`на ${current.asOfDate}`} accent="violet" />
      </div>
    </section>

    <section className="panel section income-panel"><div className="section-heading"><Icon name="income" /><div><h3>Рекомендуемый доход</h3><p>Платёж + средняя страховка превращены в бытовой индикатор нагрузки.</p></div></div><div className="metric-row"><span>Комфортно</span><strong>{formatMoney(recommendedIncomeComfort)}/мес.</strong></div><div className="metric-row"><span>Напряжённо</span><strong>{formatMoney(recommendedIncomeTense)}/мес.</strong></div>{incomeRatio !== undefined ? <div className={`income-zone ${incomeZone}`}>Ваша доля ипотеки в доходе: <b>{Math.round(incomeRatio * 100)}%</b>, зона: <b>{incomeZone}</b>.</div> : <p className="muted-note">Укажите доход — покажем вашу зону нагрузки.</p>}<div className="progress-track"><span style={{ width: `${Math.min(100, (incomeRatio ?? 0) * 100)}%` }} /></div><small className="muted-note">Это не банковское одобрение. Страховки учитываются как средняя месячная нагрузка.</small></section>

    <section className="panel section effect-panel"><div className="section-heading"><Icon name="rocket" /><div><h3>Экономия от досрочек</h3><p>{hasPrepayments ? 'Сравнение идёт с базовым планом без досрочных платежей.' : 'Добавьте досрочные платежи — snapshot сразу покажет эффект.'}</p></div></div>{hasPrepayments ? <><div className="insights-grid"><div className="insight-card"><span>Экономия процентов</span><strong>{formatMoney(result.interestSavings)}</strong></div><div className="insight-card"><span>Срок короче</span><strong>{durationText(result.monthsSaved)}</strong></div><div className="insight-card"><span>Эквивалент квартиры</span><strong>{savedApartmentEquivalent.toFixed(2)}×</strong></div></div><div className="saving-bar"><span style={{ width: `${progress}%` }} /></div><div className="saving-scale"><span>было бы банку {formatMoney(result.baseline.summary.totalInterest)}</span><span>теперь банку {formatMoney(active.summary.totalInterest)}</span><span>эффект {progress.toFixed(1)}%</span></div><p className="muted-note">Самый заметный платёж в графике: <b>{bestPayment ? `${bestPayment.date} · ${formatMoney(bestPayment.prepayment)}` : '—'}</b></p></> : <p>Добавьте досрочные, чтобы увидеть экономию, сокращение срока и лучшую выплату.</p>}</section>

    <section className="panel section"><div className="section-heading"><Icon name="rocket" /><div><h3>Что дала каждая досрочка</h3><p>Вклад считается через исключение правила из того же общего графика.</p></div></div>{effects.length ? <div className="effect-list">{effects.map((effect) => <div key={effect.id} className="insight-card"><small>{effect.title} · {effect.date}</small><strong>{formatMoney(effect.interestSavings)}</strong><span>{effect.count} событий · всего {formatMoney(effect.totalAmount)} · {modeLabel(effect.mode)}</span><span>Срок: −{durationText(effect.monthsSaved)}</span></div>)}</div> : <p className="muted-note">Пока нет досрочных платежей с положительной суммой.</p>}</section>

    <section className="panel section"><div className="section-heading"><Icon name="percent" /><div><h3>Что банк забирает на самом деле</h3><p>{timeMode === 'lifetime' ? 'За весь срок кредита.' : `На текущий момент: по платежам до ${current.asOfDate}.`}</p></div></div><div className="mode-switch"><button className={timeMode === 'lifetime' ? 'active-switch' : ''} type="button" onClick={() => setTimeMode('lifetime')}>За весь срок</button><button className={timeMode === 'current' ? 'active-switch' : ''} type="button" onClick={() => setTimeMode('current')}>На текущий момент</button></div>{timeMode === 'lifetime' ? <><div className="insights-grid"><div className="insight-card"><span>Проценты банку</span><strong>{formatMoney(active.summary.totalInterest)}</strong></div><div className="insight-card"><span>Первые 12 месяцев</span><strong>{formatMoney(firstYearInterest)}</strong><small>За первые 12 месяцев кредита банку уходит эта сумма процентов.</small></div><div className="insight-card"><span>Перелом графика</span><strong>{breakPoint ? breakPoint.date : '—'}</strong><small>С этого месяца тело платежа становится больше процентов.</small></div></div><p>За весь горизонт банк получает <b>{bankShareLifetime.toFixed(1)}%</b> от суммы регулярных платежей как проценты. В первый год тело долга уменьшается на {formatMoney(firstYearPrincipal)}.</p></> : <><div className="insights-grid"><div className="insight-card"><span>Уже уплачено процентов</span><strong>{formatMoney(current.paidInterest)}</strong></div><div className="insight-card"><span>Уже погашено тела</span><strong>{formatMoney(current.paidPrincipal + current.paidPrepayments)}</strong></div><div className="insight-card"><span>Доля банка в факте</span><strong>{bankShareCurrent.toFixed(1)}%</strong></div></div><p>За прошедшие <b>{current.elapsedMonths}</b> мес. реально уплачено {formatMoney(current.paidTotal)}, включая страховки {formatMoney(current.paidInsurance)} и досрочно {formatMoney(current.paidPrepayments)}.</p></>}</section>

    <section className="panel section"><div className="section-heading"><Icon name="home" /><div><h3>Сколько квартир вы реально оплатите</h3><p>Полная стоимость переводится в понятный бытовой масштаб.</p></div></div><div className="real-cost-box"><strong>{active.summary.realCostMultiplier.toFixed(2)}× стоимости квартиры</strong><span>Квартира стоит {formatMoney(input.propertyPrice)}, а полный денежный поток по кредиту со страховками — {formatMoney(active.summary.totalRealCost)}.</span></div><div className="progress-track apartments" aria-label={`Шкала реальной стоимости до ${realCostScaleMax} стоимостей квартиры`}><span style={{ width: `${realCostProgress}%` }} /></div><div className="saving-scale"><span>0×</span><span>{(realCostScaleMax / 2).toFixed(1)}×</span><span>{realCostScaleMax}× стоимости</span></div><p className="muted-note">Это нормированная шкала до {realCostScaleMax} стоимостей квартиры; проценты банку равны примерно {bankApartmentEquivalent.toFixed(2)} стоимости квартиры.</p></section>
  </>;
}
