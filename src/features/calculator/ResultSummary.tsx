import { buildExplainability } from '../../core/mortgage/explainability';
import type { ComparisonResult, PrepaymentMode, ScenarioResult } from '../../core/mortgage/types';
import { formatMoney } from '../../shared/formatMoney';
import { formatDate } from '../../shared/formatDate';

function getStrategyLabel(mode?: PrepaymentMode): string {
  return mode === 'reducePayment' ? 'уменьшать платёж' : 'уменьшать срок';
}

function scenarioSavings(scenario: ScenarioResult, baselineInterest: number): number {
  return Number((baselineInterest - scenario.result.summary.totalInterest).toFixed(2));
}

export function ResultSummary({ result, preferredMode }: { result: ComparisonResult; preferredMode?: PrepaymentMode }) {
  const active = result.withPrepayments;
  const explainability = buildExplainability(result);
  const baselineInterest = result.baseline.summary.totalInterest;

  return <>
    <div className="cards">
      <div className="card"><h4>Переплата</h4><p>{formatMoney(active.summary.totalInterest)}</p></div>
      <div className="card"><h4>Полная стоимость</h4><p>{formatMoney(active.summary.totalPayment)}</p></div>
      <div className="card"><h4>Дата закрытия</h4><p>{active.summary.closingDate}</p></div>
      <div className="card"><h4>Экономия</h4><p>{formatMoney(result.interestSavings)} / {result.monthsSaved} мес.</p></div>
    </div>

    <div className="panel">
      <h3>Сравнение 3 сценариев</h3>
      <div className="scenario-grid">{result.scenarios.map((scenario) => <div className="scenario-card" key={scenario.kind}>
        <strong>{scenario.label}</strong>
        <span>Переплата: {formatMoney(scenario.result.summary.totalInterest)}</span>
        <span>Срок: {scenario.result.schedule.length} мес.</span>
        <span>Экономия: {formatMoney(scenarioSavings(scenario, baselineInterest))}</span>
      </div>)}</div>
    </div>

    <div className="panel">
      <h3>Лучший ход</h3>
      <ul>
        <li>Выгоднее: <strong>{getStrategyLabel(preferredMode)}</strong>.</li>
        <li>Экономия на процентах: <strong>{formatMoney(result.interestSavings)}</strong>.</li>
        <li>Сокращение кредита: <strong>{result.monthsSaved} месяцев</strong>.</li>
        <li>Самый сильный сценарий: <strong>{result.bestScenario.label}</strong>.</li>
      </ul>
    </div>

    <div className="panel">
      <h3>Explainability</h3>
      <ul>
        <li>Переплата формируется из процентов, которые максимальны в начале графика из-за большого остатка долга.</li>
        <li>Самые дорогие месяцы по процентам: {explainability.expensiveMonths.map((m) => `${formatDate(m.date)} (${formatMoney(m.interest)})`).join(', ')}.</li>
        <li>Заметное снижение процентной нагрузки начинается: {explainability.noticeableDropMonth ? `${formatDate(explainability.noticeableDropMonth.date)}` : 'не найдено на горизонте расчёта'}.</li>
        <li>Досрочные платежи уменьшают базу начисления процентов, поэтому итоговая переплата и срок снижаются.</li>
      </ul>
    </div>
  </>;
}
