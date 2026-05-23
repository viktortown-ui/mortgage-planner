import { useMemo, useState } from 'react';
import type { PaymentRow, Prepayment } from '../../core/mortgage/types';
import { formatMoney } from '../../shared/formatMoney';

const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export function PaymentCalendar({ schedule, prepayments }: { schedule: PaymentRow[]; prepayments: Prepayment[] }) {
  const [monthShift, setMonthShift] = useState(0);
  const [selected, setSelected] = useState<PaymentRow | null>(null);
  const base = new Date(schedule[0]?.date ?? new Date().toISOString().slice(0, 10));
  base.setMonth(base.getMonth() + monthShift);
  const year = base.getFullYear(); const month = base.getMonth();
  const monthRows = schedule.filter((row) => { const d = new Date(row.date); return d.getFullYear() === year && d.getMonth() === month; });
  const prepayDays = new Set(prepayments.filter((p) => p.amount > 0).map((p) => new Date(p.date)).filter((d) => d.getFullYear() === year && d.getMonth() === month).map((d) => d.getDate()));
  const byDay = new Map(monthRows.map((row) => [new Date(row.date).getDate(), row]));
  const firstWeekDay = (new Date(year, month, 1).getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells = useMemo(() => Array.from({ length: 42 }, (_, i) => i - firstWeekDay + 1), [firstWeekDay]);

  return <div className="calendar panel"><div className="calendar-head"><h3>Календарь</h3><div><button type="button" onClick={() => setMonthShift((v) => v - 1)}>←</button><strong>{base.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}</strong><button type="button" onClick={() => setMonthShift((v) => v + 1)}>→</button></div></div><div className="calendar-week">{weekDays.map((d) => <span key={d}>{d}</span>)}</div><div className="calendar-month">{cells.map((day, idx) => {
    if (day < 1 || day > days) return <button key={idx} type="button" className="day muted" />;
    const row = byDay.get(day); const hasPrepay = prepayDays.has(day);
    return <button key={idx} type="button" className="day" onClick={() => setSelected(row ?? null)}><span>{day}</span><div className="dots">{row ? <i className="dot pay" /> : null}{hasPrepay ? <i className="dot prepay" /> : null}</div></button>;
  })}</div>
  {selected && <div className="popover"><strong>{selected.date}</strong><span>Платёж: {formatMoney(selected.payment)}</span><span>Проценты: {formatMoney(selected.interest)}</span><span>Тело долга: {formatMoney(selected.principal)}</span><span>Досрочно: {formatMoney(selected.prepayment)}</span><span>Остаток: {formatMoney(selected.remainingDebt)}</span></div>}</div>;
}
