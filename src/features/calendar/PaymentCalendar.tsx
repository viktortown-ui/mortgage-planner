import { useMemo, useState } from 'react';
import type { InsuranceEvent, PaymentRow, Prepayment } from '../../core/mortgage/types';
import { formatMoney } from '../../shared/formatMoney';

const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export function PaymentCalendar({ schedule, prepayments, insuranceEvents }: { schedule: PaymentRow[]; prepayments: Prepayment[]; insuranceEvents: InsuranceEvent[] }) {
  const [monthShift, setMonthShift] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const base = new Date(schedule[0]?.date ?? new Date().toISOString().slice(0, 10));
  base.setMonth(base.getMonth() + monthShift);
  const year = base.getFullYear(); const month = base.getMonth();
  const monthRows = schedule.filter((row) => { const d = new Date(row.date); return d.getFullYear() === year && d.getMonth() === month; });
  const prepayDays = new Set(prepayments.filter((p) => p.amount > 0).map((p) => new Date(p.date)).filter((d) => d.getFullYear() === year && d.getMonth() === month).map((d) => d.getDate()));
  const insuranceDays = new Map<number, InsuranceEvent[]>();
  insuranceEvents.forEach((event) => {
    const d = new Date(event.date);
    if (d.getFullYear() !== year || d.getMonth() !== month) return;
    const day = d.getDate();
    insuranceDays.set(day, [...(insuranceDays.get(day) ?? []), event]);
  });
  const byDay = new Map(monthRows.map((row) => [new Date(row.date).getDate(), row]));
  const selected: PaymentRow | null = selectedDate ? schedule.find((row) => row.date === selectedDate) ?? (() => {
    const events = insuranceEvents.filter((event) => event.date === selectedDate);
    if (!events.length) return null;
    const insuranceCost = events.reduce((sum, event) => sum + event.amount, 0);
    return { monthIndex: 0, date: selectedDate, payment: 0, interest: 0, principal: 0, prepayment: 0, insuranceCost, insuranceEvents: events, realPaid: insuranceCost, remainingDebt: 0 };
  })() : null;
  const firstWeekDay = (new Date(year, month, 1).getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells = useMemo(() => Array.from({ length: 42 }, (_, i) => i - firstWeekDay + 1), [firstWeekDay]);

  return <div className="calendar panel"><div className="calendar-head"><h3>Календарь</h3><div className="calendar-nav"><button type="button" onClick={() => setMonthShift((v) => v - 1)}>←</button><strong className="month-title">{base.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}</strong><button type="button" onClick={() => setMonthShift((v) => v + 1)}>→</button></div></div><div className="calendar-week">{weekDays.map((d) => <span key={d}>{d}</span>)}</div><div className="calendar-month">{cells.map((day, idx) => {
    if (day < 1 || day > days) return <button key={idx} type="button" className="day muted" />;
    const row = byDay.get(day); const hasPrepay = prepayDays.has(day); const dayInsurance = insuranceDays.get(day) ?? [];
    return <button key={idx} type="button" className="day" onClick={() => setSelectedDate(row?.date ?? dayInsurance[0]?.date ?? null)}><span>{day}</span><div className="dots">{row ? <i className="dot pay" /> : null}{hasPrepay ? <i className="dot prepay" /> : null}{dayInsurance.map((event) => <i key={`${event.date}-${event.title}-${event.amount}`} className="dot insurance" />)}</div></button>;
  })}</div>
  {selected && <div className="popover"><strong>{selected.date}</strong><span>Платёж: {formatMoney(selected.payment)}</span><span>Проценты: {formatMoney(selected.interest)}</span><span>Тело долга: {formatMoney(selected.principal)}</span><span>Досрочно: {formatMoney(selected.prepayment)}</span>{selected.prepaymentEvents?.map((event) => <span key={`${event.date}-${event.amount}`}>Досрочно {formatMoney(event.amount)} от {new Date(event.date).toLocaleDateString('ru-RU')}</span>)}{selected.insuranceEvents?.length ? <><strong>Страховки</strong>{selected.insuranceEvents.map((event) => <span key={`${event.date}-${event.title}-${event.amount}`}>{event.title}: {formatMoney(event.amount)}</span>)}</> : null}<span>Остаток: {formatMoney(selected.remainingDebt)}</span></div>}</div>;
}
