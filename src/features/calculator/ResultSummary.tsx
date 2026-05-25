import type { ComparisonResult, MortgageInput, PrepaymentMode } from '../../core/mortgage/types';
import type { AutoScenarioSettings } from '../../core/mortgage/scenarioInsights';
import { findBestPrepaymentMonth } from '../../core/mortgage/scenarioInsights';
import { formatMoney } from '../../shared/formatMoney';
import { NumericField } from '../../shared/ui/NumericField';

export function ResultSummary({ result, input, autoScenario, setAutoScenario }: { result: ComparisonResult; input: MortgageInput; autoScenario: AutoScenarioSettings; setAutoScenario: (next: AutoScenarioSettings) => void }) {
  const active = result.withPrepayments;
  const firstYear = active.schedule.slice(0, 12);
  const firstYearInterest = firstYear.reduce((acc, row) => acc + row.interest, 0);
  const firstYearPrincipal = firstYear.reduce((acc, row) => acc + row.principal, 0);
  const breakPoint = active.schedule.find((row) => row.principal > row.interest);
  const bankShare = active.summary.totalPayment > 0 ? (active.summary.totalInterest / active.summary.totalPayment) * 100 : 0;
  const hasPrepayments = input.prepayments.some((p) => p.amount > 0);
  const bestPayment = findBestPrepaymentMonth(active.schedule);

  return <>
    <div className="panel section"><h3>Центр 2. Что получилось</h3><div className="cards kpi-grid"><div className="card"><h4>Сумма кредита</h4><p>{formatMoney(input.loanAmount)}</p></div><div className="card"><h4>Ежемесячный платёж</h4><p>{formatMoney(active.monthlyPayment ?? active.schedule[0]?.payment ?? 0)}</p></div><div className="card interest"><h4>Переплата банку</h4><p>{formatMoney(active.summary.totalInterest)}</p></div><div className="card"><h4>Полная стоимость</h4><p>{formatMoney(active.summary.totalPayment)}</p></div><div className="card"><h4>Дата закрытия</h4><p>{active.summary.closingDate}</p></div></div></div>
    <div className="panel section effect-panel"><h3>Центр 4. Что даёт досрочка</h3>{hasPrepayments ? <ul><li>Экономия на процентах: <strong>{formatMoney(result.interestSavings)}</strong></li><li>Срок сокращён: <strong>{result.monthsSaved} мес.</strong></li><li>Самый полезный платёж: <strong>{bestPayment ? `${bestPayment.date} · ${formatMoney(bestPayment.prepayment)}` : '—'}</strong></li></ul> : <p>Добавьте досрочные, чтобы увидеть экономию.</p>}</div>
    <div className="panel section"><h3>Центр 3. Что банк забирает на самом деле</h3><p>В первые 12 месяцев банку уйдёт <b>{formatMoney(firstYearInterest)}</b> процентов, а в тело долга — только <b>{formatMoney(firstYearPrincipal)}</b>.</p><p>До точки перелома вы в основном платите проценты: <b>{breakPoint?.date ?? 'не найдена'}</b>.</p><p>Из каждого 1 000 ₽ платежа примерно <b>{Math.round((bankShare / 100) * 1000)} ₽</b> уходит банку.</p></div>
    <div className="panel section"><h3>Краткий автосценарий</h3><div className="quick-settings"><label><span>Доп. сумма</span><NumericField value={autoScenario.amount} onValueChange={(amount) => setAutoScenario({ ...autoScenario, amount })} /></label><label><span>Частота</span><select value={autoScenario.frequency} onChange={(e) => setAutoScenario({ ...autoScenario, frequency: e.target.value as AutoScenarioSettings['frequency'] })}><option value="monthly">каждый месяц</option><option value="semiAnnual">раз в 6 месяцев</option><option value="annual">раз в год</option></select></label><label><span>Режим</span><select value={autoScenario.mode} onChange={(e) => setAutoScenario({ ...autoScenario, mode: e.target.value as PrepaymentMode })}><option value="reduceTerm">уменьшать срок</option><option value="reducePayment">уменьшать платёж</option></select></label></div></div>
  </>;
}
