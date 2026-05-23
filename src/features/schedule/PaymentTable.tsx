import { useMemo, useState } from 'react';
import type { PaymentRow, Prepayment } from '../../core/mortgage/types';
import { formatMoney } from '../../shared/formatMoney';

type MonthPreset = 'all' | 'onlyPrepay' | 'prepayYears' | 'last12' | 'first12';

export function PaymentTable({ schedule }: { schedule: PaymentRow[]; prepayments: Prepayment[] }) {
  const [view, setView] = useState<'month' | 'year'>('month');
  const [search, setSearch] = useState(''); const [preset, setPreset] = useState<MonthPreset>('all');
  const [from, setFrom] = useState(schedule[0]?.date ?? ''); const [to, setTo] = useState(schedule.at(-1)?.date ?? '');
  const yearly = useMemo(() => { const years = new Map<number, { year: number; paymentsCount: number; paid: number; interest: number; principal: number; prepayment: number; remainingDebt: number }>(); schedule.forEach((row) => { const year = new Date(row.date).getFullYear(); const prev = years.get(year) ?? { year, paymentsCount: 0, paid: 0, interest: 0, principal: 0, prepayment: 0, remainingDebt: row.remainingDebt }; years.set(year, { year, paymentsCount: prev.paymentsCount + 1, paid: prev.paid + row.payment + row.prepayment, interest: prev.interest + row.interest, principal: prev.principal + row.principal, prepayment: prev.prepayment + row.prepayment, remainingDebt: row.remainingDebt }); }); return Array.from(years.values()); }, [schedule]);
  const filteredMonths = useMemo(() => {
    const rows = schedule.filter((r) => r.date >= from && r.date <= to && (!search || r.date.includes(search) || String(new Date(r.date).getFullYear()).includes(search)));
    if (preset === 'onlyPrepay') return rows.filter((r) => r.prepayment > 0);
    if (preset === 'prepayYears') { const years = new Set(rows.filter((r) => r.prepayment > 0).map((r) => new Date(r.date).getFullYear())); return rows.filter((r) => years.has(new Date(r.date).getFullYear())); }
    if (preset === 'last12') return rows.slice(-12);
    if (preset === 'first12') return rows.slice(0, 12);
    return rows;
  }, [schedule, from, to, search, preset]);
  const periodTotals = filteredMonths.reduce((acc, row) => ({ paid: acc.paid + row.payment + row.prepayment, interest: acc.interest + row.interest, principal: acc.principal + row.principal, prepayment: acc.prepayment + row.prepayment }), { paid: 0, interest: 0, principal: 0, prepayment: 0 });

  return <div className="table-wrap"><div className="table-head"><h3>Таблица платежей</h3><div><button type="button" className={view === 'month' ? 'active-switch' : ''} onClick={() => setView('month')}>По месяцам</button><button type="button" className={view === 'year' ? 'active-switch' : ''} onClick={() => setView('year')}>По годам</button></div></div>
  {view === 'month' && <div className="filters"><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /><input type="date" value={to} onChange={(e) => setTo(e.target.value)} /><select value={preset} onChange={(e) => setPreset(e.target.value as MonthPreset)}><option value="all">все платежи</option><option value="onlyPrepay">только досрочки</option><option value="prepayYears">только годы с досрочками</option><option value="last12">последние 12 месяцев</option><option value="first12">первые 12 месяцев</option></select><input placeholder="Поиск год/дата" value={search} onChange={(e) => setSearch(e.target.value)} /><button type="button" onClick={() => { setPreset('all'); setSearch(''); setFrom(schedule[0]?.date ?? ''); setTo(schedule.at(-1)?.date ?? ''); }}>Сбросить фильтры</button></div>}
  <div className="period-total">Итого по выбранному периоду: строк {filteredMonths.length}, платёж {formatMoney(periodTotals.paid)}, проценты {formatMoney(periodTotals.interest)}, тело {formatMoney(periodTotals.principal)}, досрочки {formatMoney(periodTotals.prepayment)}</div>
  {view === 'month' ? <table><thead><tr><th>№</th><th>Дата</th><th>Платёж</th><th>Проценты</th><th>Тело</th><th>Досрочно</th><th>Остаток</th></tr></thead><tbody>{filteredMonths.map((row) => <tr key={row.monthIndex}><td>{row.monthIndex}</td><td>{row.date}</td><td>{formatMoney(row.payment)}</td><td>{formatMoney(row.interest)}</td><td>{formatMoney(row.principal)}</td><td>{formatMoney(row.prepayment)}</td><td>{formatMoney(row.remainingDebt)}</td></tr>)}</tbody></table> : <table><thead><tr><th>Год</th><th>Платежей</th><th>Всего</th><th>Проценты</th><th>Тело</th><th>Досрочно</th><th>Остаток</th></tr></thead><tbody>{yearly.map((row) => <tr key={row.year}><td>{row.year}</td><td>{row.paymentsCount}</td><td>{formatMoney(row.paid)}</td><td>{formatMoney(row.interest)}</td><td>{formatMoney(row.principal)}</td><td>{formatMoney(row.prepayment)}</td><td>{formatMoney(row.remainingDebt)}</td></tr>)}</tbody></table>}
  </div>;
}
