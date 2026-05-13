import { useMemo, useState } from 'react';
import { Bar, BarChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { PaymentRow } from '../../core/mortgage/types';
import { formatMoney } from '../../shared/formatMoney';

export function InterestPrincipalChart({ schedule }: { schedule: PaymentRow[] }) {
  const [view, setView] = useState<'month' | 'year'>('month');

  const data = useMemo(() => {
    if (view === 'month') return schedule.map((r) => ({ ...r, label: r.monthIndex }));
    const years = new Map<number, { label: number; interest: number; principal: number }>();
    schedule.forEach((row) => {
      const year = new Date(row.date).getFullYear();
      const prev = years.get(year) ?? { label: year, interest: 0, principal: 0 };
      years.set(year, { label: year, interest: prev.interest + row.interest, principal: prev.principal + row.principal });
    });
    return Array.from(years.values());
  }, [schedule, view]);

  return <div className="chart"><div className="table-head"><h3>Проценты и тело долга</h3><div><button type="button" className={view === 'month' ? 'active-switch' : ''} onClick={() => setView('month')}>По месяцам</button><button type="button" className={view === 'year' ? 'active-switch' : ''} onClick={() => setView('year')}>По годам</button></div></div><ResponsiveContainer width="100%" height={260}><BarChart data={data}><XAxis dataKey="label" label={{ value: view === 'month' ? 'Месяц' : 'Год', position: 'insideBottom', offset: -5 }} /><YAxis /><Tooltip formatter={(value) => formatMoney(Number(value ?? 0))} labelFormatter={(label) => `${view === 'month' ? 'Месяц' : 'Год'}: ${label}`} /><Legend /><Bar name="Проценты" dataKey="interest" fill="#ef4444" /><Bar name="Тело долга" dataKey="principal" fill="#10b981" /></BarChart></ResponsiveContainer></div>;
}
