import { useMemo, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { PaymentRow } from '../../core/mortgage/types';
import { formatMoney } from '../../shared/formatMoney';

export function DebtChart({ schedule }: { schedule: PaymentRow[] }) {
  const [view, setView] = useState<'month' | 'year'>('month');

  const data = useMemo(() => {
    if (view === 'month') return schedule.map((r) => ({ label: new Date(r.date).toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' }), remainingDebt: r.remainingDebt, payment: r.payment, prepayment: r.prepayment, events: r.prepaymentEvents }));
    return [];
  }, [schedule, view]);

  return <div className="chart"><div className="table-head"><h3>Остаток долга</h3><div><button type="button" className={view === 'month' ? 'active-switch' : ''} onClick={() => setView('month')}>По месяцам</button><button type="button" className={view === 'year' ? 'active-switch' : ''} onClick={() => setView('year')}>По годам</button></div></div><ResponsiveContainer width="100%" height={300}><LineChart data={data}><CartesianGrid stroke="var(--chart-grid, #334155)" strokeOpacity={0.35} strokeDasharray="4 4" /><XAxis dataKey="label" stroke="var(--chart-axis, #94a3b8)" /><YAxis stroke="var(--chart-axis, #94a3b8)" tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} /><Tooltip contentStyle={{ background: 'var(--panel-bg, #0f172a)', border: '1px solid #475569', color: '#e2e8f0' }} formatter={(value) => formatMoney(Number(value ?? 0))} labelFormatter={(label, payload) => { const row = payload?.[0]?.payload as typeof data[number] | undefined; return row?.prepayment ? `${label} · Досрочно: ${formatMoney(row.prepayment)} · Остаток после досрочки: ${formatMoney(row.remainingDebt)}` : String(label); }} /><Legend /><Line type="monotone" name="Остаток долга" dataKey="remainingDebt" stroke="#3b82f6" strokeWidth={4} dot={false} />{view === 'month' ? data.map((row, i) => row.prepayment > 0 ? <ReferenceDot key={i} x={row.label} y={row.remainingDebt} r={6} fill="#a855f7" /> : null) : null}</LineChart></ResponsiveContainer></div>;
}
