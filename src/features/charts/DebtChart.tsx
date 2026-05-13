import { useMemo, useState } from 'react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { PaymentRow } from '../../core/mortgage/types';
import { formatMoney } from '../../shared/formatMoney';

export function DebtChart({ schedule }: { schedule: PaymentRow[] }) {
  const [view, setView] = useState<'month' | 'year'>('month');

  const data = useMemo(() => {
    if (view === 'month') return schedule.map((r) => ({ label: r.monthIndex, remainingDebt: r.remainingDebt }));
    const years = new Map<number, { year: number; remainingDebt: number; label: number }>();
    schedule.forEach((row) => {
      const year = new Date(row.date).getFullYear();
      years.set(year, { year, remainingDebt: row.remainingDebt, label: year });
    });
    return Array.from(years.values());
  }, [schedule, view]);

  return <div className="chart"><div className="table-head"><h3>Остаток долга</h3><div><button type="button" className={view === 'month' ? 'active-switch' : ''} onClick={() => setView('month')}>По месяцам</button><button type="button" className={view === 'year' ? 'active-switch' : ''} onClick={() => setView('year')}>По годам</button></div></div><ResponsiveContainer width="100%" height={260}><LineChart data={data}><XAxis dataKey="label" label={{ value: view === 'month' ? 'Месяц' : 'Год', position: 'insideBottom', offset: -5 }} /><YAxis /><Tooltip formatter={(value) => formatMoney(Number(value ?? 0))} labelFormatter={(label) => `${view === 'month' ? 'Месяц' : 'Год'}: ${label}`} /><Line type="monotone" name="Остаток долга" dataKey="remainingDebt" stroke="#2463eb" dot={false} /></LineChart></ResponsiveContainer></div>;
}
