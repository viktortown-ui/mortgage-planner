import { useMemo, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { PaymentRow } from '../../core/mortgage/types';
import { formatMoney } from '../../shared/formatMoney';

export function DebtChart({ schedule }: { schedule: PaymentRow[] }) {
  const [view, setView] = useState<'month' | 'year'>('month');

  const data = useMemo(() => {
    if (view === 'month') return schedule.map((r) => ({ label: new Date(r.date).toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' }), remainingDebt: r.remainingDebt, payment: r.payment, prepayment: r.prepayment }));
    const years = new Map<number, { label: string; remainingDebt: number; payment: number; prepayment: number }>();
    schedule.forEach((row) => {
      const year = new Date(row.date).getFullYear();
      const prev = years.get(year) ?? { label: String(year), remainingDebt: row.remainingDebt, payment: 0, prepayment: 0 };
      years.set(year, { label: String(year), remainingDebt: row.remainingDebt, payment: prev.payment + row.payment, prepayment: prev.prepayment + row.prepayment });
    });
    return Array.from(years.values());
  }, [schedule, view]);

  return <div className="chart"><div className="table-head"><h3>Остаток долга</h3><div><button type="button" className={view === 'month' ? 'active-switch' : ''} onClick={() => setView('month')}>По месяцам</button><button type="button" className={view === 'year' ? 'active-switch' : ''} onClick={() => setView('year')}>По годам</button></div></div><ResponsiveContainer width="100%" height={280}><LineChart data={data}><CartesianGrid stroke="#dbeafe" strokeDasharray="4 4" /><XAxis dataKey="label" /><YAxis tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} /><Tooltip formatter={(value) => formatMoney(Number(value ?? 0))} /><Legend /><Line type="monotone" name="Остаток долга" dataKey="remainingDebt" stroke="#2563eb" strokeWidth={3} dot={false} />{view === 'month' ? data.map((row, i) => row.prepayment > 0 ? <ReferenceDot key={i} x={row.label} y={row.remainingDebt} r={4} fill="#8b5cf6" /> : null) : null}</LineChart></ResponsiveContainer></div>;
}
