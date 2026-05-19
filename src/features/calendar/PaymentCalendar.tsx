import { useMemo, useState } from 'react';
import type { PaymentRow } from '../../core/mortgage/types';
import { formatMoney } from '../../shared/formatMoney';

const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export function PaymentCalendar({ schedule }: { schedule: PaymentRow[] }) {
  const [monthShift, setMonthShift] = useState(0);
  const [selected, setSelected] = useState<PaymentRow | null>(null);
  const base = new Date(schedule[0]?.date ?? new Date().toISOString().slice(0, 10));
  base.setMonth(base.getMonth() + monthShift);
  const year = base.getFullYear();
  const month = base.getMonth();
  const monthRows = schedule.filter((row) => { const d = new Date(row.date); return d.getFullYear() === year && d.getMonth() === month; });
  const byDay = new Map(monthRows.map((row) => [new Date(row.date).getDate(), row]));
  const firstWeekDay = (new Date(year, month, 1).getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells = useMemo(() => Array.from({ length: 42 }, (_, i) => i - firstWeekDay + 1), [firstWeekDay]);

  return <div className="calendar panel"><div className="calendar-head"><h3>Календарь платежей</h3><div><button type="button" onClick={() => setMonthShift((v) => v - 1)}>←</button><strong>{base.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}</strong><button type="button" onClick={() => setMonthShift((v) => v + 1)}>→</button></div></div>
    <div className="calendar-week">{weekDays.map((d) => <span key={d}>{d}</span>)}</div>
    <div className="calendar-month">{cells.map((day, idx) => {
      if (day < 1 || day > days) return <button key={idx} type="button" className="day muted" />;
      const row = byDay.get(day);
      return <button key={idx} type="button" className={`day${row?.prepayment ? ' has-prepay' : row ? ' has-pay' : ''}`} onClick={() => setSelected(row ?? null)}><span>{day}</span>{row && <i className="dot pay" />}{row?.prepayment ? <i className="dot prepay" /> : null}</button>;
    })}</div>
    <p className="calendar-note">Сетка готова для будущих событий: коммуналка, страховка, ремонт, налоги.</p>
    {selected && <div className="popover"><strong>{selected.date}</strong><span>Платёж: {formatMoney(selected.payment)}</span><span>Проценты: {formatMoney(selected.interest)}</span><span>Тело долга: {formatMoney(selected.principal)}</span><span>Досрочно: {formatMoney(selected.prepayment)}</span><span>Остаток долга: {formatMoney(selected.remainingDebt)}</span></div>}
  </div>;
}
