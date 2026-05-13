import type { PaymentRow } from '../../core/mortgage/types';
import { formatDate } from '../../shared/formatDate';

export function PaymentCalendar({ schedule }: { schedule: PaymentRow[] }) {
  const lastTwelveStart = Math.max(0, schedule.length - 12);

  return <div className="calendar"><h3>Календарь платежей</h3><div className="calendar-grid">{schedule.slice(0, 24).map((row) => {
    const hasPrepayment = row.prepayment > 0;
    const isLastYear = row.monthIndex - 1 >= lastTwelveStart;

    return <div
      key={row.monthIndex}
      className={`calendar-item${hasPrepayment ? ' calendar-item-prepay' : ''}${isLastYear ? ' calendar-item-last' : ''}`}
      title={`Платёж: ${Math.round(row.payment)} ₽\nПроценты: ${Math.round(row.interest)} ₽\nТело долга: ${Math.round(row.principal)} ₽\nОстаток долга: ${Math.round(row.remainingDebt)} ₽\nДосрочно: ${Math.round(row.prepayment)} ₽`}
    >
      <strong>{formatDate(row.date)}</strong><span>{Math.round(row.payment + row.prepayment)} ₽</span>{hasPrepayment && <em>Досрочно</em>}
    </div>;
  })}</div></div>;
}
