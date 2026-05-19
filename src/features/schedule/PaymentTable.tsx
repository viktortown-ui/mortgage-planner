import { useMemo, useState } from 'react';
import type { PaymentRow, Prepayment } from '../../core/mortgage/types';
import { formatMoney } from '../../shared/formatMoney';

export function PaymentTable({ schedule, prepayments }: { schedule: PaymentRow[]; prepayments: Prepayment[] }) {
  const [view, setView] = useState<'month' | 'year'>('month');
  const yearly = useMemo(() => {
    const years = new Map<number, { year: number; paymentsCount: number; paid: number; interest: number; principal: number; prepayment: number; remainingDebt: number }>();
    schedule.forEach((row) => {
      const year = new Date(row.date).getFullYear();
      const prev = years.get(year) ?? { year, paymentsCount: 0, paid: 0, interest: 0, principal: 0, prepayment: 0, remainingDebt: row.remainingDebt };
      years.set(year, { year, paymentsCount: prev.paymentsCount + 1, paid: prev.paid + row.payment + row.prepayment, interest: prev.interest + row.interest, principal: prev.principal + row.principal, prepayment: prev.prepayment + row.prepayment, remainingDebt: row.remainingDebt });
    });
    return Array.from(years.values());
  }, [schedule]);

  return <div className="table-wrap"><div className="table-head"><h3>Таблица платежей</h3><div><button type="button" className={view === 'month' ? 'active-switch' : ''} onClick={() => setView('month')}>По месяцам</button><button type="button" className={view === 'year' ? 'active-switch' : ''} onClick={() => setView('year')}>По годам</button></div></div>
    {view === 'month' ? <table><thead><tr><th>№</th><th>Дата</th><th>Платёж</th><th>Проценты</th><th>Тело долга</th><th>Досрочно</th><th>Остаток</th><th>Событие</th></tr></thead><tbody>{schedule.map((row) => { const mode = prepayments.find((p) => p.date === row.date && p.amount > 0)?.mode; return <tr key={row.monthIndex} className={row.prepayment > 0 ? 'row-prepay' : ''}><td>{row.monthIndex}</td><td>{row.date}</td><td>{formatMoney(row.payment)}</td><td>{formatMoney(row.interest)}</td><td>{formatMoney(row.principal)}</td><td>{formatMoney(row.prepayment)}</td><td>{formatMoney(row.remainingDebt)}</td><td>{row.prepayment > 0 ? `Досрочно +${formatMoney(row.prepayment)}, ${mode === 'reducePayment' ? 'уменьшение платежа' : 'уменьшение срока'}` : <span className="muted-note">обычный платёж</span>}</td></tr>; })}</tbody></table> : <table><thead><tr><th>Год</th><th>Платежей за год</th><th>Всего уплачено</th><th>Проценты</th><th>Тело долга</th><th>Досрочно</th><th>Остаток на конец года</th><th>Итог года</th></tr></thead><tbody>{yearly.map((row) => <tr key={row.year} className={row.prepayment > 0 ? 'row-prepay' : ''}><td>{row.year}</td><td>{row.paymentsCount}</td><td>{formatMoney(row.paid)}</td><td>{formatMoney(row.interest)}</td><td>{formatMoney(row.principal)}</td><td>{formatMoney(row.prepayment)}</td><td>{formatMoney(row.remainingDebt)}</td><td>{row.remainingDebt <= 1 ? 'закрытие кредита' : row.prepayment > 0 ? 'была досрочка' : 'обычный год'}</td></tr>)}</tbody></table>}
  </div>;
}
