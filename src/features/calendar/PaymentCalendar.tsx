import type { PaymentRow } from '../../core/mortgage/types';
import { formatDate } from '../../shared/formatDate';

export function PaymentCalendar({ schedule }: { schedule: PaymentRow[] }) {
  return <div className="calendar"><h3>Календарь платежей</h3><div className="calendar-grid">{schedule.slice(0,24).map((row)=><div key={row.monthIndex} className="calendar-item"><strong>{formatDate(row.date)}</strong><span>{Math.round(row.payment + row.prepayment)} ₽</span></div>)}</div></div>;
}
