import { useMemo, useState } from 'react';
import type { PaymentRow, Prepayment } from '../../core/mortgage/types';
import { formatMoney } from '../../shared/formatMoney';

function toCsv(schedule: PaymentRow[]): string {
  const header = ['Месяц', 'Дата', 'Платёж', 'Проценты', 'Тело долга', 'Досрочно', 'Остаток долга'];
  const rows = schedule.map((row) => [row.monthIndex, row.date, row.payment.toFixed(2), row.interest.toFixed(2), row.principal.toFixed(2), row.prepayment.toFixed(2), row.remainingDebt.toFixed(2)]);
  return [header, ...rows].map((r) => r.join(',')).join('\n');
}

export function PaymentTable({ schedule, prepayments }: { schedule: PaymentRow[]; prepayments: Prepayment[] }) {
  const [view, setView] = useState<'month' | 'year'>('month');
  const yearly = useMemo(() => {
    const years = new Map<number, { year: number; payment: number; interest: number; principal: number; prepayment: number; remainingDebt: number }>();
    schedule.forEach((row) => {
      const year = new Date(row.date).getFullYear();
      const prev = years.get(year) ?? { year, payment: 0, interest: 0, principal: 0, prepayment: 0, remainingDebt: row.remainingDebt };
      years.set(year, { year, payment: prev.payment + row.payment, interest: prev.interest + row.interest, principal: prev.principal + row.principal, prepayment: prev.prepayment + row.prepayment, remainingDebt: row.remainingDebt });
    });
    return Array.from(years.values());
  }, [schedule]);

  const exportCsv = () => {
    const blob = new Blob([toCsv(schedule)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'mortgage_schedule.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return <div className="table-wrap"><div className="table-head"><h3>Таблица платежей</h3><div><button type="button" className={view === 'month' ? 'active-switch' : ''} onClick={() => setView('month')}>По месяцам</button><button type="button" className={view === 'year' ? 'active-switch' : ''} onClick={() => setView('year')}>По годам</button><button type="button" onClick={exportCsv}>Скачать CSV</button></div></div>
    {view === 'month' ? <table><thead><tr><th>#</th><th>Дата</th><th>Платёж</th><th>Проценты</th><th>Тело долга</th><th>Досрочно</th><th>Остаток долга</th><th>Пометка</th></tr></thead><tbody>{schedule.map((row) => { const mode = prepayments.find((p) => p.date === row.date && p.amount > 0)?.mode; return <tr key={row.monthIndex} className={row.prepayment > 0 ? 'row-prepay' : ''}><td>{row.monthIndex}</td><td>{row.date}</td><td>{formatMoney(row.payment)}</td><td>{formatMoney(row.interest)}</td><td>{formatMoney(row.principal)}</td><td>{formatMoney(row.prepayment)}</td><td>{formatMoney(row.remainingDebt)}</td><td>{row.prepayment > 0 ? `Досрочно: ${formatMoney(row.prepayment)}; Режим: ${mode === 'reducePayment' ? 'уменьшение платежа' : 'уменьшение срока'}` : '-'}</td></tr>; })}</tbody></table> : <table><thead><tr><th>Год</th><th>Всего платежей</th><th>Проценты</th><th>Тело долга</th><th>Досрочно</th><th>Остаток на конец года</th></tr></thead><tbody>{yearly.map((row) => <tr key={row.year} className={row.prepayment > 0 ? 'row-prepay' : ''}><td>{row.year}</td><td>{formatMoney(row.payment)}</td><td>{formatMoney(row.interest)}</td><td>{formatMoney(row.principal)}</td><td>{formatMoney(row.prepayment)}</td><td>{formatMoney(row.remainingDebt)}</td></tr>)}</tbody></table>}
  </div>;
}
