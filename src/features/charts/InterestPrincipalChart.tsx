import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { PaymentRow } from '../../core/mortgage/types';
import { formatMoney } from '../../shared/formatMoney';

export function InterestPrincipalChart({ schedule }: { schedule: PaymentRow[] }) {
  const [view, setView] = useState<'month' | 'year'>('month');

  const data = useMemo(() => {
    if (view === 'month') return schedule.map((r) => ({ label: r.monthIndex, interest: r.interest, principal: r.principal, prepayment: r.prepayment }));
    const years = new Map<number, { label: number; interest: number; principal: number; prepayment: number; remainingDebt: number }>();
    schedule.forEach((row) => {
      const year = new Date(row.date).getFullYear();
      const prev = years.get(year) ?? { label: year, interest: 0, principal: 0, prepayment: 0, remainingDebt: row.remainingDebt };
      years.set(year, { label: year, interest: prev.interest + row.interest, principal: prev.principal + row.principal, prepayment: prev.prepayment + row.prepayment, remainingDebt: row.remainingDebt });
    });
    return Array.from(years.values());
  }, [schedule, view]);

  return <div className="chart"><div className="table-head"><h3>Проценты и тело долга</h3><div><button type="button" className={view === 'month' ? 'active-switch' : ''} onClick={() => setView('month')}>По месяцам</button><button type="button" className={view === 'year' ? 'active-switch' : ''} onClick={() => setView('year')}>По годам</button></div></div><ResponsiveContainer width="100%" height={280}><BarChart data={data}><CartesianGrid stroke="#fee2e2" strokeDasharray="4 4" /><XAxis dataKey="label" /><YAxis tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} /><Tooltip formatter={(value) => formatMoney(Number(value ?? 0))} /><Legend /><Bar stackId="pay" name="Проценты" dataKey="interest" fill="#f97316" /><Bar stackId="pay" name="Тело долга" dataKey="principal" fill="#22c55e" /><Bar name="Досрочно" dataKey="prepayment" fill="#8b5cf6" /></BarChart></ResponsiveContainer></div>;
}
