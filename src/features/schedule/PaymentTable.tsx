import type { PaymentRow } from '../../core/mortgage/types';
import { formatMoney } from '../../shared/formatMoney';

export function PaymentTable({ schedule }: { schedule: PaymentRow[] }) {
  return <div className="table-wrap"><h3>Таблица платежей</h3><table><thead><tr><th>#</th><th>Дата</th><th>Платёж</th><th>Проценты</th><th>Тело</th><th>Досрочно</th><th>Остаток</th></tr></thead><tbody>{schedule.map((row)=><tr key={row.monthIndex}><td>{row.monthIndex}</td><td>{row.date}</td><td>{formatMoney(row.payment)}</td><td>{formatMoney(row.interest)}</td><td>{formatMoney(row.principal)}</td><td>{formatMoney(row.prepayment)}</td><td>{formatMoney(row.remainingDebt)}</td></tr>)}</tbody></table></div>;
}
