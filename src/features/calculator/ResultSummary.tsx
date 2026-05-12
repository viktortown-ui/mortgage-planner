import type { ComparisonResult } from '../../core/mortgage/types';
import { formatMoney } from '../../shared/formatMoney';

export function ResultSummary({ result }: { result: ComparisonResult }) {
  const active = result.withPrepayments;
  return <div className="cards">
    <div className="card"><h4>Переплата</h4><p>{formatMoney(active.summary.totalInterest)}</p></div>
    <div className="card"><h4>Полная стоимость</h4><p>{formatMoney(active.summary.totalPayment)}</p></div>
    <div className="card"><h4>Дата закрытия</h4><p>{active.summary.closingDate}</p></div>
    <div className="card"><h4>Экономия</h4><p>{formatMoney(result.interestSavings)} / {result.monthsSaved} мес.</p></div>
  </div>;
}
