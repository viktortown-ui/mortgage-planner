import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { TooltipContentProps, TooltipValueType } from 'recharts';
import type { PaymentRow } from '../../core/mortgage/types';
import { formatMoney } from '../../shared/formatMoney';
import {
  formatExactDate,
  formatShortMonthYear,
  getMonthTickStep,
  shouldShowMonthTick,
} from './chartDateLabels';
import { RotatedMonthTick } from './RotatedMonthTick';

type ChartView = 'month' | 'year';

type InterestPrincipalPoint = {
  date?: string;
  events?: PaymentRow['prepaymentEvents'];
  interest: number;
  label: string | number;
  monthIndex?: number;
  prepayment: number;
  prepaymentEvent: number;
  principal: number;
  regularPayment: number;
  remainingDebt: number;
  totalPayment: number;
  insurance: number;
};

const MONTH_POINT_WIDTH = 22;
const YEAR_POINT_WIDTH = 58;
const MIN_CHART_WIDTH = 760;
const MONTH_X_AXIS_HEIGHT = 104;
const YEAR_X_AXIS_HEIGHT = 50;

const chartColors = {
  interest: '#f97316',
  principal: '#16a34a',
  prepayment: '#8b5cf6',
  insurance: '#eab308',
} as const;

function formatAxisMoney(value: number) {
  if (value === 0) return '0';

  const absoluteValue = Math.abs(value);
  if (absoluteValue >= 1_000_000) return `${Number((value / 1_000_000).toFixed(1))}m`;
  if (absoluteValue >= 1_000) return `${Math.round(value / 1_000)}k`;
  return String(Math.round(value));
}

function buildMonthlyData(schedule: PaymentRow[]): InterestPrincipalPoint[] {
  return schedule.map((row) => {
    const regularPayment = row.interest + row.principal;
    const hugePrepayment = row.prepayment > regularPayment * 2;

    return {
      date: row.date,
      events: row.prepaymentEvents,
      interest: row.interest,
      label: row.monthIndex,
      monthIndex: row.monthIndex,
      prepayment: hugePrepayment ? 0 : row.prepayment,
      prepaymentEvent: hugePrepayment ? row.prepayment : 0,
      principal: row.principal,
      regularPayment,
      remainingDebt: row.remainingDebt,
      totalPayment: regularPayment + row.prepayment + row.insuranceCost,
      insurance: row.insuranceCost,
    };
  });
}

function buildYearlyData(schedule: PaymentRow[]): InterestPrincipalPoint[] {
  const byYear = new Map<string, InterestPrincipalPoint>();

  schedule.forEach((row) => {
    const year = new Date(row.date).getFullYear().toString();
    const regularPayment = row.interest + row.principal;
    const existing = byYear.get(year);

    if (existing) {
      existing.interest += row.interest;
      existing.principal += row.principal;
      existing.prepayment += row.prepayment;
      existing.regularPayment += regularPayment;
      existing.remainingDebt = row.remainingDebt;
      existing.totalPayment += regularPayment + row.prepayment + row.insuranceCost;
      existing.prepaymentEvent += row.prepayment;
      existing.insurance += row.insuranceCost;
      existing.events = [...(existing.events ?? []), ...(row.prepaymentEvents ?? [])];
      return;
    }

    byYear.set(year, {
      date: row.date,
      events: row.prepaymentEvents,
      interest: row.interest,
      label: year,
      prepayment: row.prepayment,
      prepaymentEvent: row.prepayment,
      principal: row.principal,
      regularPayment,
      remainingDebt: row.remainingDebt,
      totalPayment: regularPayment + row.prepayment + row.insuranceCost,
      insurance: row.insuranceCost,
    });
  });

  return Array.from(byYear.values());
}

function formatTooltipLabel(row: InterestPrincipalPoint | undefined, fallbackLabel: string | number, view: ChartView) {
  if (!row) return String(fallbackLabel);

  const date = row.date ? formatExactDate(row.date) : undefined;
  const eventDetails = row.events?.length
    ? row.events
        .map((event) => `${new Date(event.date).toLocaleDateString('ru-RU')} ${formatMoney(event.amount)}`)
        .join(', ')
    : undefined;

  const title = view === 'month'
    ? `Месяц ${row.monthIndex ?? fallbackLabel}${date ? ` · ${date}` : ''}`
    : `Год ${row.label}`;

  return eventDetails ? `${title} · досрочно: ${eventDetails}` : title;
}

function ChartTooltip({ active, label, payload }: TooltipContentProps<TooltipValueType, string | number>, view: ChartView) {
  if (!active || !payload.length) return null;

  const row = payload[0]?.payload as InterestPrincipalPoint | undefined;
  if (!row) return null;

  const values = [
    { color: chartColors.interest, label: 'Проценты', value: row.interest },
    { color: chartColors.principal, label: 'Тело долга', value: row.principal },
    { color: chartColors.prepayment, label: 'Досрочно', value: row.prepayment + row.prepaymentEvent },
    { color: chartColors.insurance, label: 'Страховки', value: row.insurance },
    { color: 'var(--chart-tooltip-title)', label: 'Всего за период', value: row.totalPayment },
    { color: 'var(--chart-axis-text)', label: 'Остаток долга', value: row.remainingDebt },
  ];

  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip__title">{formatTooltipLabel(row, label ?? row.label, view)}</div>
      {values.map((item) => (
        <div className="chart-tooltip__row" key={item.label}>
          <span>
            <span className="chart-tooltip__dot" style={{ background: item.color }} />
            {item.label}
          </span>
          <strong>{formatMoney(item.value)}</strong>
        </div>
      ))}
    </div>
  );
}

export function InterestPrincipalChart({ schedule }: { schedule: PaymentRow[] }) {
  const [view, setView] = useState<ChartView>('month');

  const data = useMemo(
    () => view === 'month' ? buildMonthlyData(schedule) : buildYearlyData(schedule),
    [schedule, view],
  );
  const monthTickStep = useMemo(() => getMonthTickStep(data.length), [data.length]);
  const visibleTickLabels = useMemo(() => new Map<string | number, string>(
    data.flatMap((row) => {
      if (view === 'year') return [[row.label, String(row.label)] as const];
      if (!row.date || !row.monthIndex) return [];
      const shouldShow = shouldShowMonthTick(row.monthIndex, data.length, monthTickStep);

      return shouldShow ? [[row.label, formatShortMonthYear(row.date)] as const] : [];
    }),
  ), [data, monthTickStep, view]);
  const minChartWidth = Math.max(MIN_CHART_WIDTH, data.length * (view === 'month' ? MONTH_POINT_WIDTH : YEAR_POINT_WIDTH));

  return (
    <div className="chart">
      <div className="table-head">
        <h3>Реальная стоимость по времени</h3>
        <div>
          <button type="button" className={view === 'month' ? 'active-switch' : ''} onClick={() => setView('month')}>
            По месяцам
          </button>
          <button type="button" className={view === 'year' ? 'active-switch' : ''} onClick={() => setView('year')}>
            По годам
          </button>
        </div>
      </div>
      <p className="muted-note">
        Stacked bar показывает обычный платёж, досрочно и страховки. Страховки не уменьшают долг и не искажают график остатка долга.
      </p>
      <div
        className="chart-scroll"
        role="region"
        aria-label="График процентов и тела долга с горизонтальной прокруткой"
        tabIndex={0}
      >
        <div style={{ minWidth: minChartWidth }}>
          <ResponsiveContainer width="100%" height={370}>
            <BarChart barCategoryGap="18%" barGap={2} data={data} margin={{ top: 20, right: 42, bottom: view === 'month' ? 108 : 48, left: 16 }}>
              <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeOpacity={1} strokeDasharray="3 6" />
              <XAxis
                axisLine={{ stroke: 'var(--chart-axis)', strokeWidth: 1 }}
                dataKey="label"
                height={view === 'month' ? MONTH_X_AXIS_HEIGHT : YEAR_X_AXIS_HEIGHT}
                interval={0}
                minTickGap={34}
                tick={<RotatedMonthTick angle={view === 'month' ? -55 : 0} dy={view === 'month' ? 28 : 20} visibleLabels={visibleTickLabels} />}
                tickLine={{ stroke: 'var(--chart-axis)', strokeWidth: 1 }}
              />
              <YAxis
                axisLine={{ stroke: 'var(--chart-axis)', strokeWidth: 1 }}
                tick={{ fill: 'var(--chart-axis-text)', fontSize: 12 }}
                tickCount={5}
                tickFormatter={(value) => formatAxisMoney(Number(value))}
                tickLine={{ stroke: 'var(--chart-axis)', strokeWidth: 1 }}
                width={54}
              />
              <Tooltip content={(props) => ChartTooltip(props, view)} cursor={{ fill: 'var(--chart-cursor)' }} />
              <Bar
                stackId="pay"
                name="Проценты"
                dataKey="interest"
                fill={chartColors.interest}
                radius={[4, 4, 0, 0]}
                maxBarSize={18}
              />
              <Bar
                stackId="pay"
                name="Тело долга"
                dataKey="principal"
                fill={chartColors.principal}
                radius={[4, 4, 0, 0]}
                maxBarSize={18}
              />
              <Bar
                stackId="pay"
                name="Досрочно"
                dataKey="prepayment"
                fill={chartColors.prepayment}
                radius={[4, 4, 0, 0]}
                maxBarSize={18}
              />
              <Bar
                stackId="pay"
                name="Страховки"
                dataKey="insurance"
                fill={chartColors.insurance}
                radius={[4, 4, 0, 0]}
                maxBarSize={18}
              />
              {data.map((row) => row.prepaymentEvent > 0 ? (
                <ReferenceDot
                  key={row.label}
                  x={row.label}
                  y={row.regularPayment}
                  r={5}
                  fill={chartColors.prepayment}
                  stroke="var(--panel)"
                  strokeWidth={2}
                />
              ) : null)}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="chart-fixed-legend" aria-label="Цвета графика">
        <span className="chart-fixed-legend__item">
          <span className="chart-fixed-legend__marker" style={{ background: chartColors.prepayment }} />
          Досрочно
        </span>
        <span className="chart-fixed-legend__item">
          <span className="chart-fixed-legend__marker" style={{ background: chartColors.interest }} />
          Проценты
        </span>
        <span className="chart-fixed-legend__item">
          <span className="chart-fixed-legend__marker" style={{ background: chartColors.principal }} />
          Тело долга
        </span>
        <span className="chart-fixed-legend__item">
          <span className="chart-fixed-legend__marker" style={{ background: chartColors.insurance }} />
          Страховки
        </span>
      </div>
    </div>
  );
}
