import { Bar, BarChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { PaymentRow } from '../../core/mortgage/types';

export function InterestPrincipalChart({ schedule }: { schedule: PaymentRow[] }) {
  return <div className="chart"><h3>Проценты и тело долга</h3><ResponsiveContainer width="100%" height={260}><BarChart data={schedule}><XAxis dataKey="monthIndex"/><YAxis/><Tooltip/><Legend/><Bar dataKey="interest" fill="#ef4444"/><Bar dataKey="principal" fill="#10b981"/></BarChart></ResponsiveContainer></div>;
}
