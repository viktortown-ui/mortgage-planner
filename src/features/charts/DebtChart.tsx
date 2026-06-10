import { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { TooltipContentProps, TooltipValueType } from 'recharts';
import type { PaymentRow } from '../../core/mortgage/types';
import { formatMoney } from '../../shared/formatMoney';
import { formatFullMonth, formatShortMonthYear, getMonthTickStep, shouldShowMonthTick } from './chartDateLabels';
import { RotatedMonthTick } from './RotatedMonthTick';

type ChartView = 'month' | 'year';

type DebtPoint = {
  date: string;
  events?: PaymentRow['prepaymentEvents'];
  label: string | number;
  monthIndex?: number;
  payment: number;
  prepayment: number;
  remainingDebt: number;
};

const MONTH_POINT_WIDTH = 20;
const YEAR_POINT_WIDTH = 64;
const MIN_CHART_WIDTH = 760;

function buildMonthlyData(schedule: PaymentRow[]): DebtPoint[] {
  return schedule.map((row) => ({
    date: row.date,
    events: row.prepaymentEvents,
    label: row.monthIndex,
    monthIndex: row.monthIndex,
    payment: row.payment,
    prepayment: row.prepayment,
    remainingDebt: row.remainingDebt,
  }));
}

function buildYearlyData(schedule: PaymentRow[]): DebtPoint[] {
  const byYear = new Map<string, DebtPoint>();

  schedule.forEach((row) => {
    const year = new Date(row.date).getFullYear().toString();
    const existing = byYear.get(year);

    if (existing) {
      existing.date = row.date;
      existing.events = [...(existing.events ?? []), ...(row.prepaymentEvents ?? [])];
      existing.payment += row.payment;
      existing.prepayment += row.prepayment;
      existing.remainingDebt = row.remainingDebt;
      return;
    }

    byYear.set(year, {
      date: row.date,
      events: row.prepaymentEvents,
      label: year,
      payment: row.payment,
      prepayment: row.prepayment,
      remainingDebt: row.remainingDebt,
    });
  });

  return Array.from(byYear.values());
}

function DebtTooltip({ active, label, payload }: TooltipContentProps<TooltipValueType, string | number>, view: ChartView) {
  if (!active || !payload.length) return null;

  const row = payload[0]?.payload as DebtPoint | undefined;
  if (!row) return null;

  const eventDetails = row.events?.length
    ? row.events.map((event) => `${new Date(event.date).toLocaleDateString('ru-RU')} ${formatMoney(event.amount)}`).join(', ')
    : undefined;
  const title = view === 'month'
    ? `Месяц ${row.monthIndex ?? label} · ${formatFullMonth(row.date)}`
    : `Год ${row.label}`;

  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip__title">{eventDetails ? `${title} · досрочно: ${eventDetails}` : title}</div>
      <div className="chart-tooltip__row"><span>Остаток долга</span><strong>{formatMoney(row.remainingDebt)}</strong></div>
      <div className="chart-tooltip__row"><span>Платёж</span><strong>{formatMoney(row.payment)}</strong></div>
      <div className="chart-tooltip__row"><span>Досрочно</span><strong>{formatMoney(row.prepayment)}</strong></div>
    </div>
  );
}

export function DebtChart({ schedule }: { schedule: PaymentRow[] }) {
  const [view, setView] = useState<ChartView>('month');
  const data = useMemo(() => view === 'month' ? buildMonthlyData(schedule) : buildYearlyData(schedule), [schedule, view]);
  const monthTickStep = useMemo(() => getMonthTickStep(data.length), [data.length]);
  const visibleTickLabels = useMemo(() => new Map<string | number, string>(
    data.flatMap((row) => {
      if (view === 'year') return [[row.label, String(row.label)] as const];
      if (!row.monthIndex) return [];
      const shouldShow = shouldShowMonthTick(row.monthIndex, data.length, monthTickStep);

      return shouldShow ? [[row.label, formatShortMonthYear(row.date)] as const] : [];
    }),
  ), [data, monthTickStep, view]);
  const minChartWidth = Math.max(MIN_CHART_WIDTH, data.length * (view === 'month' ? MONTH_POINT_WIDTH : YEAR_POINT_WIDTH));

  return (
    <div className="chart">
      <div className="table-head">
        <h3>Остаток долга</h3>
        <div>
          <button type="button" className={view === 'month' ? 'active-switch' : ''} onClick={() => setView('month')}>По месяцам</button>
          <button type="button" className={view === 'year' ? 'active-switch' : ''} onClick={() => setView('year')}>По годам</button>
        </div>
      </div>
      <div className="chart-scroll" role="region" aria-label="График остатка долга с горизонтальной прокруткой" tabIndex={0}>
        <div style={{ minWidth: minChartWidth }}>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={data} margin={{ top: 18, right: 38, bottom: view === 'month' ? 92 : 40, left: 14 }}>
              <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeOpacity={1} strokeDasharray="3 6" />
              <XAxis
                axisLine={{ stroke: 'var(--chart-axis)', strokeWidth: 1 }}
                dataKey="label"
                interval={0}
                minTickGap={32}
                tick={<RotatedMonthTick dy={view === 'month' ? 24 : 18} visibleLabels={visibleTickLabels} />}
                tickLine={{ stroke: 'var(--chart-axis)', strokeWidth: 1 }}
              />
              <YAxis
                axisLine={{ stroke: 'var(--chart-axis)', strokeWidth: 1 }}
                tick={{ fill: 'var(--chart-axis-text)', fontSize: 12 }}
                tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`}
                tickLine={{ stroke: 'var(--chart-axis)', strokeWidth: 1 }}
                width={54}
              />
              <Tooltip content={(props) => DebtTooltip(props, view)} cursor={{ stroke: 'var(--chart-cursor)', strokeWidth: 16 }} />
              <Line type="monotone" name="Остаток долга" dataKey="remainingDebt" stroke="#3b82f6" strokeWidth={4} dot={false} />
              {data.map((row) => row.prepayment > 0 ? <ReferenceDot key={row.label} x={row.label} y={row.remainingDebt} r={6} fill="#a855f7" stroke="var(--panel)" strokeWidth={2} /> : null)}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="chart-fixed-legend" aria-label="Цвета графика">
        <span className="chart-fixed-legend__item">
          <span className="chart-fixed-legend__marker" style={{ background: '#3b82f6' }} />
          Остаток долга
        </span>
        <span className="chart-fixed-legend__item">
          <span className="chart-fixed-legend__marker" style={{ background: '#a855f7' }} />
          Досрочно
        </span>
      </div>
    </div>
  );
}
