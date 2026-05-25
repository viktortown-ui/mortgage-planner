import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { PaymentRow } from '../../core/mortgage/types';
import { formatMoney } from '../../shared/formatMoney';

export function InterestPrincipalChart({ schedule }: { schedule: PaymentRow[] }) {
  const [view, setView] = useState<'month' | 'year'>('month');

  const data = useMemo(() => schedule.map((r) => {
    const regular = r.interest + r.principal;
    const huge = r.prepayment > regular * 2;
    return { label: r.monthIndex, interest: r.interest, principal: r.principal, prepayment: huge ? 0 : r.prepayment, prepaymentEvent: huge ? r.prepayment : 0, regularPayment: regular, events: r.prepaymentEvents };
  }), [schedule]);

  return <div className="chart"><div className="table-head"><h3>Проценты и тело долга</h3><div><button type="button" className={view === 'month' ? 'active-switch' : ''} onClick={() => setView('month')}>По месяцам</button><button type="button" className={view === 'year' ? 'active-switch' : ''} onClick={() => setView('year')}>По годам</button></div></div><p className="muted-note">Крупные досрочные платежи показаны маркерами, чтобы не ломать масштаб обычных платежей.</p><ResponsiveContainer width="100%" height={300}><BarChart barCategoryGap="12%" data={data}><CartesianGrid stroke="var(--chart-grid, #334155)" strokeOpacity={0.35} strokeDasharray="4 4" /><XAxis dataKey="label" stroke="var(--chart-axis, #94a3b8)" /><YAxis stroke="var(--chart-axis, #94a3b8)" tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} /><Tooltip contentStyle={{ background: 'var(--panel-bg, #0f172a)', border: '1px solid #475569', color: '#e2e8f0' }} formatter={(value) => formatMoney(Number(value ?? 0))} labelFormatter={(label, payload) => { const row = payload?.[0]?.payload as typeof data[number] | undefined; const details = row?.events?.map((e) => `${new Date(e.date).toLocaleDateString('ru-RU')} ${formatMoney(e.amount)}`).join(', '); return `Месяц ${label}${details ? ` · ${details}` : ''}`; }} /><Legend /><Bar stackId="pay" name="Проценты" dataKey="interest" fill="#fb923c" maxBarSize={42} /><Bar stackId="pay" name="Тело долга" dataKey="principal" fill="#4ade80" maxBarSize={42} /><Bar name="Досрочно" dataKey="prepayment" fill="#a78bfa" maxBarSize={42} />{data.map((row) => row.prepaymentEvent > 0 ? <ReferenceDot key={row.label} x={row.label} y={row.regularPayment} r={6} fill="#a855f7" /> : null)}</BarChart></ResponsiveContainer></div>;
}
