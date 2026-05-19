import type { ComparisonResult, MortgageInput, PrepaymentMode } from '../../core/mortgage/types';
import type { AutoScenarioSettings } from '../../core/mortgage/scenarioInsights';
import { buildAutoScenario, findBestPrepaymentMonth } from '../../core/mortgage/scenarioInsights';
import { formatMoney } from '../../shared/formatMoney';

function monthsToLabel(months: number): string {
  return `${months} мес.`;
}

export function ResultSummary({ result, input, autoScenario, setAutoScenario }: { result: ComparisonResult; input: MortgageInput; autoScenario: AutoScenarioSettings; setAutoScenario: (next: AutoScenarioSettings) => void }) {
  const active = result.withPrepayments;
  const hasPrepayments = input.prepayments.some((p) => p.amount > 0);
  const bestPayment = findBestPrepaymentMonth(active.schedule);
  const autoResult = buildAutoScenario(input, autoScenario);

  const scenarioCards = [
    { key: 'baseline', title: 'Без досрочек', data: result.baseline },
    ...(hasPrepayments ? [{ key: 'my', title: 'Мои досрочки', data: active }] : []),
  ];

  const renderInsight = (mode: PrepaymentMode | undefined) => mode === 'reducePayment' ? 'фокус на снижении ежемесячной нагрузки' : 'фокус на сокращении срока кредита';

  return <>
    <div className="panel">
      <h3>Итог по ипотеке</h3>
      <p className="hint">{hasPrepayments ? 'Досрочные платежи уже сокращают переплату. Ниже видно, где именно меняется график.' : 'Пока это базовый график. Добавьте досрочный платёж, чтобы увидеть, сколько можно сэкономить.'}</p>
      <div className="cards kpi-grid">
        <div className="card"><h4>Сумма кредита</h4><p>{formatMoney(input.loanAmount)}</p></div>
        <div className="card"><h4>Ежемесячный платёж</h4><p>{formatMoney(active.monthlyPayment ?? active.schedule[0]?.payment ?? 0)}</p></div>
        <div className="card"><h4>Переплата банку</h4><p>{formatMoney(active.summary.totalInterest)}</p><small>Сколько уйдёт банку сверх суммы кредита</small></div>
        <div className="card"><h4>Полная стоимость</h4><p>{formatMoney(active.summary.totalPayment)}</p><small>Сумма кредита + проценты</small></div>
        <div className="card"><h4>Дата закрытия</h4><p>{active.summary.closingDate}</p><small>Когда кредит будет закрыт по текущему плану</small></div>
      </div>
    </div>

    <div className="panel effect-panel"><h3>Эффект досрочек</h3>
      {!hasPrepayments ? <p>Досрочные платежи не добавлены. Добавьте дату и сумму, чтобы увидеть экономию.</p> : <ul><li>Экономия на процентах: <strong>{formatMoney(result.interestSavings)}</strong></li><li>Срок сокращён на <strong>{monthsToLabel(result.monthsSaved)}</strong></li><li>Было закрытие: <strong>{result.baseline.summary.closingDate}</strong></li><li>Стало закрытие: <strong>{active.summary.closingDate}</strong></li><li>Самый полезный платёж: <strong>{bestPayment ? `${bestPayment.date} · ${formatMoney(bestPayment.prepayment)}` : '—'}</strong></li></ul>}
    </div>

    <div className="panel"><h3>Сравнение вариантов досрочного погашения</h3>
      <div className="quick-settings"><h4>Быстрая проверка сценариев</h4>
        <label><span>Дополнительная сумма</span><input type="number" value={autoScenario.amount} onChange={(e) => setAutoScenario({ ...autoScenario, amount: Number(e.target.value) })} /></label>
        <label><span>Частота</span><select value={autoScenario.frequency} onChange={(e) => setAutoScenario({ ...autoScenario, frequency: e.target.value as AutoScenarioSettings['frequency'] })}><option value="monthly">каждый месяц</option><option value="semiAnnual">раз в 6 месяцев</option><option value="annual">раз в год</option></select></label>
        <label><span>Режим</span><select value={autoScenario.mode} onChange={(e) => setAutoScenario({ ...autoScenario, mode: e.target.value as PrepaymentMode })}><option value="reduceTerm">уменьшать срок</option><option value="reducePayment">уменьшать платёж</option></select></label>
      </div>
      <div className="scenario-grid">{scenarioCards.map((item) => <div className="scenario-card" key={item.key}><strong>{item.title}</strong><span>Переплата: {formatMoney(item.data.summary.totalInterest)}</span><span>Срок: {item.data.schedule.length} мес.</span><span>Дата закрытия: {item.data.summary.closingDate}</span><span>Экономия: {formatMoney(result.baseline.summary.totalInterest - item.data.summary.totalInterest)}</span><span>Сокращение срока: {result.baseline.schedule.length - item.data.schedule.length} мес.</span><em>{item.key === 'baseline' ? 'База для честного сравнения.' : `Ваш план: ${renderInsight(input.prepayments[0]?.mode)}.`}</em></div>)}
        <div className="scenario-card"><strong>Автосценарий</strong>{!autoResult ? <p>Введите сумму, чтобы сравнить регулярную досрочку.</p> : <><span>Переплата: {formatMoney(autoResult.summary.totalInterest)}</span><span>Срок: {autoResult.schedule.length} мес.</span><span>Дата закрытия: {autoResult.summary.closingDate}</span><span>Экономия: {formatMoney(result.baseline.summary.totalInterest - autoResult.summary.totalInterest)}</span><span>Сокращение срока: {result.baseline.schedule.length - autoResult.schedule.length} мес.</span><em>Автоматическая стратегия: {renderInsight(autoScenario.mode)}.</em></>}</div>
      </div>
    </div>
  </>;
}
