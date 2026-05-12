import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { PaymentRow } from '../../core/mortgage/types';

export function DebtChart({ schedule }: { schedule: PaymentRow[] }) {
  return <div className="chart"><h3>Остаток долга</h3><ResponsiveContainer width="100%" height={260}><LineChart data={schedule}><XAxis dataKey="monthIndex"/><YAxis/><Tooltip/><Line type="monotone" dataKey="remainingDebt" stroke="#2463eb" dot={false}/></LineChart></ResponsiveContainer></div>;
}
