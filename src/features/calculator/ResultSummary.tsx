import { useMemo, useState, type CSSProperties } from 'react';
import type { MortgageInput, MortgageSnapshot, PrepaymentMode } from '../../core/mortgage/types';
import { calculatePrepaymentEffects, type PrepaymentEffectInsight } from '../../core/mortgage/prepaymentEffects';
import { formatMoney } from '../../shared/formatMoney';
import { Icon, type IconName } from '../../shared/ui/Icon';

const modeLabel = (mode: PrepaymentMode) => (mode === 'reduceTerm' ? 'уменьшение срока' : 'уменьшение платежа');
const durationText = (months: number) => months >= 12 ? `${Math.floor(months / 12)} г. ${months % 12} мес.` : `${months} мес.`;
const percent = (value: number) => `${Math.round(value)}%`;
const formatMultiplier = (value: number) => `${value.toFixed(2)}×`;
const formatLoad = (value?: number) => value === undefined ? '—' : `${Math.round(value * 100)}%`;
const readableLoadZone = (value?: number) => {
  if (value === undefined) return 'доход не указан';
  if (value < 0.3) return 'зелёная';
  if (value < 0.4) return 'жёлтая';
  if (value < 0.5) return 'оранжевая';
  return 'красная';
};

type TimeMode = 'lifetime' | 'current';
type Accent = 'blue' | 'green' | 'orange' | 'violet' | 'gold' | 'slate';

function KpiCard({ icon, title, value, note, accent = 'blue', help }: { icon: IconName; title: string; value: string; note?: string; accent?: Accent; help?: string }) {
  return <div className={`kpi-card accent-${accent}`} title={help}><div className="kpi-icon"><Icon name={icon} /></div><div><span>{title}</span><strong>{value}</strong>{note ? <small>{note}</small> : null}</div></div>;
}

function MetricCard({ title, value, note, accent = 'slate' }: { title: string; value: string; note?: string; accent?: Accent }) {
  return <div className={`metric-card accent-${accent}`}><span>{title}</span><strong>{value}</strong>{note ? <small>{note}</small> : null}</div>;
}

function Gauge({ value, label }: { value: number; label: string }) {
  const safe = Math.max(0, Math.min(100, value));
  const fill = safe / 2;
  return <div className="mini-gauge" style={{ '--gauge-fill': `${fill}%` } as CSSProperties}><div><strong>{percent(safe)}</strong><span>{label}</span></div></div>;
}

function BarSegments({ segments, ariaLabel }: { segments: { label: string; value: number; accent: Accent }[]; ariaLabel: string }) {
  const total = segments.reduce((sum, segment) => sum + Math.max(0, segment.value), 0);
  return <div className="semantic-bar" aria-label={ariaLabel}>{segments.map((segment) => {
    const width = total > 0 ? (Math.max(0, segment.value) / total) * 100 : 0;
    return <span key={segment.label} className={`bar-segment accent-${segment.accent}`} style={{ width: `${width}%` }} title={`${segment.label}: ${formatMoney(segment.value)}`} />;
  })}</div>;
}

function paymentLabel(effect?: PrepaymentEffectInsight) {
  if (!effect) return '—';
  return `${effect.date} · ${formatMoney(effect.totalAmount)}`;
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
  const hasPrepayments = input.prepayments.some((prepayment) => prepayment.amount > 0);
  const averageMonthlyInsurance = active.schedule.length > 0 ? active.summary.totalInsuranceCost / active.schedule.length : 0;
  const monthlyObligation = (active.monthlyPayment ?? active.schedule[0]?.payment ?? 0) + averageMonthlyInsurance;
  const recommendedIncomeComfort = monthlyObligation / 0.3;
  const recommendedIncomeTense = monthlyObligation / 0.4;
  const incomeRatio = input.incomeMonthly && input.incomeMonthly > 0 ? monthlyObligation / input.incomeMonthly : undefined;
  const incomeZone = incomeRatio === undefined ? '' : incomeRatio <= 0.3 ? 'зелёная' : incomeRatio <= 0.4 ? 'жёлтая' : incomeRatio <= 0.5 ? 'оранжевая' : 'красная';
  const bankApartmentEquivalent = input.propertyPrice > 0 ? active.summary.totalInterest / input.propertyPrice : 0;
  const insuranceApartmentEquivalent = input.propertyPrice > 0 ? active.summary.totalInsuranceCost / input.propertyPrice : 0;
  const savedApartmentEquivalent = input.propertyPrice > 0 ? result.interestSavings / input.propertyPrice : 0;
  const totalCashflowApartmentEquivalent = input.propertyPrice > 0 ? active.summary.totalRealCost / input.propertyPrice : 0;
  const reducePaymentImpact = snapshot.scenarioSummary.reducePaymentImpact;
  const paymentCardTitle = reducePaymentImpact.hasReducePayment ? (reducePaymentImpact.alreadyApplied ? 'Текущий платёж' : 'Сейчас платёж') : 'Ежемесячный платёж';
  const paymentCardValue = formatMoney(reducePaymentImpact.hasReducePayment ? current.currentScheduledPayment : (active.monthlyPayment ?? active.schedule[0]?.payment ?? 0));
  const paymentCardNote = reducePaymentImpact.hasReducePayment
    ? reducePaymentImpact.alreadyApplied
      ? `Было ${formatMoney(reducePaymentImpact.paymentBefore)}, стало ${formatMoney(reducePaymentImpact.paymentAfter)} · −${formatMoney(reducePaymentImpact.monthlyPaymentReduction)}/мес.`
      : `После досрочки от ${reducePaymentImpact.nextReducePaymentDate ?? '—'} станет примерно ${formatMoney(reducePaymentImpact.paymentAfter)} · снижение −${formatMoney(reducePaymentImpact.monthlyPaymentReduction)}/мес.`
    : 'регулярный платёж без страховок';
  const effects = useMemo(() => calculatePrepaymentEffects(input), [input]);
  const bestBySavings = effects.reduce<PrepaymentEffectInsight | undefined>((best, effect) => !best || effect.interestSavings > best.interestSavings ? effect : best, undefined);
  const biggestByAmount = effects.reduce<PrepaymentEffectInsight | undefined>((biggest, effect) => !biggest || effect.totalAmount > biggest.totalAmount ? effect : biggest, undefined);
  const bestAndBiggestDiffer = Boolean(bestBySavings && biggestByAmount && bestBySavings.id !== biggestByAmount.id);
  const savingsProgress = Math.min(100, result.interestSavings > 0 ? (result.interestSavings / Math.max(1, result.baseline.summary.totalInterest)) * 100 : 0);
  const planInterestProgress = Math.max(0, 100 - savingsProgress);
  const principalShare = input.loanAmount > 0 ? ((current.paidPrincipal + current.paidPrepayments) / input.loanAmount) * 100 : 0;
  const remainingPrincipal = current.remainingPrincipal;
  const futureInterestRemaining = current.futureInterestRemaining;
  const futureInsuranceRemaining = current.futureInsuranceRemaining;
  const remainingTotalCashflow = current.remainingTotalCashflow;
  const totalPaidToDate = current.totalPaidToDate;

  return <>
    <section className="hero-summary">
      <div className="hero-copy">
        <p className="eyebrow">Обзор без финансового жаргона</p>
        <h2>Что получилось</h2>
        <p>Сначала показываем долг по телу кредита, затем будущие платежи, цену кредита процентами и эффект досрочных платежей.</p>
      </div>
      <div className="hero-gauges"><Gauge value={principalShare} label="тела погашено" /><Gauge value={incomeRatio ? incomeRatio * 100 : 0} label="нагрузка" /></div>
      <div className="summary-groups">
        <KpiCard icon="home" title="Сумма кредита" value={formatMoney(input.loanAmount)} note="тело кредита на старте" />
        <KpiCard icon="calendar" title={paymentCardTitle} value={paymentCardValue} note={paymentCardNote} accent={reducePaymentImpact.hasReducePayment ? 'violet' : 'blue'} />
        <KpiCard icon="calendar" title="Дата закрытия" value={snapshot.fullPlan.closingDate} note={`${snapshot.fullPlan.monthsTotal} платежей`} accent="green" />
        <KpiCard icon="percent" title="Проценты за весь срок" value={formatMoney(snapshot.fullPlan.totalInterestFullPlan)} note={`${bankShareLifetime.toFixed(1)}% регулярных платежей`} accent="orange" help="Сколько банк получит сверх суммы кредита." />
        <KpiCard icon="shield" title="Страховки за весь срок" value={formatMoney(snapshot.fullPlan.totalInsuranceCost)} note="не уменьшают тело долга" accent="gold" />
        <KpiCard icon="income" title="Рекомендованный доход" value={`${formatMoney(recommendedIncomeComfort)}/мес.`} note="комфортная нагрузка до 30%" accent="green" />
      </div>
    </section>


    {reducePaymentImpact.hasReducePayment ? <section className="panel section payment-relief-panel">
      <div className="section-heading"><Icon name="income" /><div><h3>Как изменится ежемесячная нагрузка</h3><p>Режим «уменьшить платёж» показываем отдельно от экономии срока.</p></div></div>
      <div className="insights-grid">
        <MetricCard title="Сейчас платёж" value={`${formatMoney(reducePaymentImpact.paymentBefore)}/мес.`} accent="blue" />
        <MetricCard title="После снижения" value={`${formatMoney(reducePaymentImpact.paymentAfter)}/мес.`} accent="violet" />
        <MetricCard title="Освободится" value={`${formatMoney(reducePaymentImpact.monthlyPaymentReduction)}/мес.`} accent="green" />
        <MetricCard title="За год это" value={formatMoney(reducePaymentImpact.annualFreedCashflow)} accent="green" />
      </div>
      {reducePaymentImpact.incomeLoadBefore !== undefined ? <p className="explain-note">Платёж снизится с {formatMoney(reducePaymentImpact.paymentBefore)} до {formatMoney(reducePaymentImpact.paymentAfter)}. Нагрузка на доход снизится с {formatLoad(reducePaymentImpact.incomeLoadBefore)} до {formatLoad(reducePaymentImpact.incomeLoadAfter)}: зона была {readableLoadZone(reducePaymentImpact.incomeLoadBefore)}, станет {readableLoadZone(reducePaymentImpact.incomeLoadAfter)}.</p> : <p className="muted-note">Доход не указан — нагрузку оценить нельзя.</p>}
      <p className="muted-note">Этот режим не обязан сильно сокращать срок. Его смысл — сделать ежемесячную жизнь легче.</p>
    </section> : null}

    <section className="panel section choice-help-panel">
      <div className="section-heading"><Icon name="shield" /><div><h3>Что выбрать?</h3><p>Два режима решают разные жизненные задачи.</p></div></div>
      <div className="insights-grid">
        <MetricCard title="Уменьшить срок" value="Больше экономия" note="Больше экономия процентов, быстрее закрытие кредита." accent="blue" />
        <MetricCard title="Уменьшить платёж" value="Меньше давление" note="Меньше ежемесячное давление, больше свободных денег каждый месяц." accent="violet" />
      </div>
      <p className="explain-note">Математически чаще выгоднее уменьшать срок. Но если важнее запас и спокойствие — снижение платежа может быть жизненно сильнее.</p>
    </section>

    <section className="panel section now-panel">
      <div className="section-heading"><Icon name="chart" /><div><h3>Кредит сейчас</h3><p>Разделяем тело кредита, будущий денежный поток и проценты. Остаток тела — это не всё, что ещё предстоит выплатить.</p></div></div>
      <div className="now-grid">
        <KpiCard icon="home" title="Остаток тела кредита" value={formatMoney(remainingPrincipal)} note="Это основной долг без будущих процентов." accent="blue" help="Это долг без будущих процентов. Банк ещё начислит проценты, если кредит не закрыть досрочно." />
        <KpiCard icon="income" title="Ещё предстоит выплатить" value={formatMoney(remainingTotalCashflow)} note="Тело + будущие проценты + страховки." accent="slate" help="Сколько денег уйдёт с этого момента до закрытия кредита по текущему плану." />
        <KpiCard icon="percent" title="Уже оплачено процентов" value={formatMoney(current.paidInterestToDate)} note="Фактически ушло банку за прошедшие платежи." accent="slate" />
        <KpiCard icon="percent" title="Осталось процентов" value={formatMoney(futureInterestRemaining)} note="Будущая переплата, если идти по текущему плану." accent="orange" />
      </div>
      <div className="cashflow-mini-grid">
        <MetricCard title="Уже погашено тела кредита" value={formatMoney(current.paidPrincipalToDate)} note="регулярными платежами" accent="blue" />
        <MetricCard title="Уже внесено досрочно" value={formatMoney(current.paidPrepaymentsToDate)} note="ускоренное погашение тела" accent="violet" />
        <MetricCard title="Будущие страховки" value={formatMoney(futureInsuranceRemaining)} note="до закрытия кредита" accent="gold" />
        <MetricCard title="Всего уже уплачено" value={formatMoney(totalPaidToDate)} note="тело + проценты + досрочки + страховки" accent="slate" />
      </div>
    </section>

    <section className="panel section effect-panel">
      <div className="section-heading"><Icon name="rocket" /><div><h3>Экономия от досрочек</h3><p>{hasPrepayments ? 'Сравниваем с вариантом, где досрочных платежей нет.' : 'Добавьте досрочные платежи — сразу покажем экономию процентов и срока.'}</p></div></div>
      {hasPrepayments ? <>
        <div className="insights-grid">
          <MetricCard title="Без досрочек проценты за весь срок были бы" value={formatMoney(result.baseline.summary.totalInterest)} accent="orange" />
          <MetricCard title="С текущими досрочками проценты за весь срок будут" value={formatMoney(active.summary.totalInterest)} accent="blue" />
          <MetricCard title="Вы срезали будущую переплату" value={formatMoney(result.interestSavings)} note={`${durationText(result.monthsSaved)} меньше срока`} accent="green" />
        </div>
        <div className="interest-scale" aria-label="Сравнение процентов без досрочек, текущего плана и экономии">
          <div className="interest-scale__track"><span className="interest-scale__saved" style={{ width: `${savingsProgress}%` }} /><span className="interest-scale__left" style={{ width: `${planInterestProgress}%` }} /></div>
          <div className="saving-scale"><span>без досрочек: {formatMoney(result.baseline.summary.totalInterest)}</span><span>по текущему плану: {formatMoney(active.summary.totalInterest)}</span><span>сэкономлено: {formatMoney(result.interestSavings)}</span></div>
        </div>
        <p className="muted-note">Сравнение идёт только по процентам. Тело кредита считается отдельно.</p>
        <div className="best-payment-grid">
          <MetricCard title="Самый выгодный по экономии процентов" value={paymentLabel(bestBySavings)} note={bestBySavings ? `экономия ${formatMoney(bestBySavings.interestSavings)}` : undefined} accent="green" />
          <MetricCard title="Самый крупный по сумме" value={paymentLabel(biggestByAmount)} note={biggestByAmount ? `внесено ${formatMoney(biggestByAmount.totalAmount)}` : undefined} accent="violet" />
        </div>
        {bestAndBiggestDiffer ? <p className="explain-note">Ранний платёж может экономить больше, чем более крупный поздний, потому что раньше снижает тело кредита.</p> : null}
      </> : <p>Добавьте досрочные, чтобы увидеть экономию, сокращение срока и лучшую выплату.</p>}
    </section>

    <section className="panel section">
      <div className="section-heading"><Icon name="rocket" /><div><h3>Что дала каждая досрочка</h3><p>Считаем вклад этого платежа отдельно: как изменился бы график без него.</p></div></div>
      {effects.length ? <div className="effect-list">{effects.map((effect) => <article key={effect.id} className="prepayment-effect-card">
        <h4>{effect.count > 1 ? `${effect.count} платежа за месяц или правило` : `${effect.title} от ${effect.date}`}</h4>
        {effect.count > 1 ? <p className="muted-note">{effect.title} · с {effect.date}</p> : null}
        <dl>
          <div><dt>{effect.count > 1 ? 'Всего внесено' : 'Внесено'}</dt><dd>{formatMoney(effect.totalAmount)}</dd></div>
          <div><dt>Экономия процентов</dt><dd>{formatMoney(effect.interestSavings)}</dd></div>
          {effect.mode === 'reduceTerm' ? <div><dt>Срок сокращён</dt><dd>{durationText(effect.monthsSaved)}</dd></div> : null}
          {effect.mode === 'reducePayment' ? <>
            <div><dt>Платёж до</dt><dd>{formatMoney(effect.paymentBefore ?? 0)}</dd></div>
            <div><dt>Платёж после</dt><dd>{formatMoney(effect.paymentAfter ?? 0)}</dd></div>
            <div><dt>Освободилось в месяц</dt><dd>{formatMoney(effect.monthlyFreed ?? 0)}</dd></div>
          </> : null}
          <div><dt>Режим</dt><dd>{modeLabel(effect.mode)}</dd></div>
          {effect.count > 1 ? <div><dt>Средний эффект одного платежа</dt><dd>{formatMoney(effect.interestSavings / effect.count)}</dd></div> : null}
        </dl>
        {effect.mode === 'reducePayment' ? <small>{effect.isFuture ? `Платёж снизится после даты: ${effect.date}.` : `Платёж уже снижен с ${formatMoney(effect.paymentBefore ?? 0)} до ${formatMoney(effect.paymentAfter ?? 0)}.`}</small> : <small>Вклад считается как разница между текущим планом и планом без этого платежа.</small>}
      </article>)}</div> : <p className="muted-note">Пока нет досрочных платежей с положительной суммой.</p>}
    </section>

    <section className="panel section">
      <div className="section-heading"><Icon name="percent" /><div><h3>Что банк забирает на самом деле</h3><p>{timeMode === 'lifetime' ? 'Это прогноз по всему кредиту при текущем плане.' : `Это факт/модель по уже прошедшим платежам до ${current.asOfDate}.`}</p></div></div>
      <div className="mode-switch"><button className={timeMode === 'lifetime' ? 'active-switch' : ''} type="button" onClick={() => setTimeMode('lifetime')}>За весь срок</button><button className={timeMode === 'current' ? 'active-switch' : ''} type="button" onClick={() => setTimeMode('current')}>На текущий момент</button></div>
      {timeMode === 'lifetime' ? <>
        <div className="insights-grid">
          <MetricCard title="Проценты за весь срок" value={formatMoney(active.summary.totalInterest)} note="сколько банк получит сверх суммы кредита" accent="orange" />
          <MetricCard title="Проценты в первые 12 месяцев" value={formatMoney(firstYearInterest)} note={`тело за первый год уменьшилось на ${formatMoney(firstYearPrincipal)}`} accent="orange" />
          <MetricCard title="Месяц перелома" value={breakPoint ? breakPoint.date : '—'} note="с этого месяца тело в платеже больше процентов" accent="blue" />
          <MetricCard title="Доля процентов в регулярных платежах" value={`${bankShareLifetime.toFixed(1)}%`} note="за весь срок" accent="slate" />
        </div>
      </> : <>
        <div className="insights-grid">
          <MetricCard title="Уже оплачено процентов" value={formatMoney(current.paidInterestToDate)} accent="orange" />
          <MetricCard title="Уже погашено тела" value={formatMoney(current.paidPrincipalToDate)} note="без досрочных платежей" accent="blue" />
          <MetricCard title="Уже внесено досрочно" value={formatMoney(current.paidPrepaymentsToDate)} note="это ускоренное погашение тела" accent="violet" />
          <MetricCard title="Доля процентов в фактически уплаченных платежах" value={`${bankShareCurrent.toFixed(1)}%`} accent="slate" />
        </div>
      </>}
    </section>

    <section className="panel section">
      <div className="section-heading"><Icon name="home" /><div><h3>Во сколько квартир обойдётся ипотека</h3><p>Переводим весь денежный поток в понятный бытовой масштаб.</p></div></div>
      <div className="real-cost-box"><strong>Это {formatMultiplier(totalCashflowApartmentEquivalent)} такой квартиры.</strong><span>Квартира стоит {formatMoney(input.propertyPrice)}, но по текущему плану весь денежный поток составит {formatMoney(active.summary.totalRealCost)}.</span></div>
      <BarSegments ariaLabel="Из чего складывается стоимость ипотеки" segments={[{ label: 'сама квартира', value: input.propertyPrice, accent: 'blue' }, { label: 'проценты банку', value: active.summary.totalInterest, accent: 'orange' }, { label: 'страховки', value: active.summary.totalInsuranceCost, accent: 'gold' }, { label: 'сэкономленная переплата', value: result.interestSavings, accent: 'green' }]} />
      <div className="apartment-breakdown">
        <span><b>сама квартира:</b> 1.00×</span>
        <span><b>проценты банку:</b> {formatMultiplier(bankApartmentEquivalent)}</span>
        <span><b>страховки:</b> {formatMultiplier(insuranceApartmentEquivalent)}</span>
        <span><b>досрочки снизили переплату на:</b> {formatMultiplier(savedApartmentEquivalent)}</span>
      </div>
      {hasPrepayments ? <p className="muted-note">Без досрочек итоговая стоимость была бы выше. Досрочки уже уменьшили цену кредита на {formatMultiplier(savedApartmentEquivalent)} стоимости квартиры.</p> : null}
    </section>

    <section className="panel section money-flow-panel">
      <div className="section-heading"><Icon name="income" /><div><h3>Куда ушли и уйдут деньги</h3><p>Досрочные платежи не являются переплатой: они быстрее уменьшают тело кредита.</p></div></div>
      <BarSegments ariaLabel="Куда уходят деньги по ипотеке" segments={[{ label: 'Тело кредита', value: input.loanAmount, accent: 'blue' }, { label: 'Проценты банку', value: active.summary.totalInterest, accent: 'orange' }, { label: 'Страховки', value: active.summary.totalInsuranceCost, accent: 'gold' }, { label: 'Досрочные платежи', value: current.paidPrepaymentsToDate, accent: 'violet' }]} />
      <div className="flow-legend"><span className="accent-blue">Тело кредита</span><span className="accent-orange">Проценты банку</span><span className="accent-gold">Страховки</span><span className="accent-violet">Досрочные платежи — часть тела</span></div>
    </section>

    <section className="panel section income-panel">
      <div className="section-heading"><Icon name="income" /><div><h3>Рекомендуемый доход</h3><p>Платёж + средняя страховка превращены в индикатор нагрузки.</p></div></div>
      <div className="metric-row"><span>Комфортно</span><strong>{formatMoney(recommendedIncomeComfort)}/мес.</strong></div>
      <div className="metric-row"><span>Напряжённо</span><strong>{formatMoney(recommendedIncomeTense)}/мес.</strong></div>
      {incomeRatio !== undefined ? <div className={`income-zone ${incomeZone}`}>Ваша доля ипотеки в доходе: <b>{Math.round(incomeRatio * 100)}%</b>, зона: <b>{incomeZone}</b>.</div> : <p className="muted-note">Укажите доход — покажем вашу зону нагрузки.</p>}
      <div className="progress-track"><span style={{ width: `${Math.min(100, (incomeRatio ?? 0) * 100)}%` }} /></div><small className="muted-note">Это не банковское одобрение. Страховки учитываются как средняя месячная нагрузка.</small>
    </section>
  </>;
}
