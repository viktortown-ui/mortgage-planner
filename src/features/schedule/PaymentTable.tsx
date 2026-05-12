import type { PaymentRow } from '../../core/mortgage/types';
import { formatMoney } from '../../shared/formatMoney';

function toCsv(schedule: PaymentRow[]): string {
  const header = ['Месяц', 'Дата', 'Платеж', 'Проценты', 'Тело', 'Досрочно', 'Остаток'];
  const rows = schedule.map((row) => [
    row.monthIndex,
    row.date,
    row.payment.toFixed(2),
    row.interest.toFixed(2),
    row.principal.toFixed(2),
    row.prepayment.toFixed(2),
    row.remainingDebt.toFixed(2),
  ]);

  return [header, ...rows].map((r) => r.join(',')).join('\n');
}

export function PaymentTable({ schedule }: { schedule: PaymentRow[] }) {
  const exportCsv = () => {
    const blob = new Blob([toCsv(schedule)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'mortgage_schedule.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return <div className="table-wrap"><div className="table-head"><h3>Таблица платежей</h3><button type="button" onClick={exportCsv}>Экспорт CSV</button></div><table><thead><tr><th>#</th><th>Дата</th><th>Платёж</th><th>Проценты</th><th>Тело</th><th>Досрочно</th><th>Остаток</th></tr></thead><tbody>{schedule.map((row)=><tr key={row.monthIndex}><td>{row.monthIndex}</td><td>{row.date}</td><td>{formatMoney(row.payment)}</td><td>{formatMoney(row.interest)}</td><td>{formatMoney(row.principal)}</td><td>{formatMoney(row.prepayment)}</td><td>{formatMoney(row.remainingDebt)}</td></tr>)}</tbody></table></div>;
}
