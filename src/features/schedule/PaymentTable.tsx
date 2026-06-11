import { useMemo, useState } from 'react';
import type { PaymentRow, Prepayment } from '../../core/mortgage/types';
import { formatMoney } from '../../shared/formatMoney';

type MonthPreset = 'all' | 'onlyPrepay' | 'onlyInsurance' | 'prepayYears' | 'last12' | 'first12';
const fullDate = (isoDate: string) => new Date(isoDate).toLocaleDateString('ru-RU');
const modeLabel = (mode: Prepayment['mode']) => (mode === 'reduceTerm' ? 'уменьшение срока' : 'уменьшение платежа');

export function PaymentTable({ schedule, prepayments }: { schedule: PaymentRow[]; prepayments: Prepayment[] }) {
  const [view, setView] = useState<'month' | 'year'>('month');
  const [search, setSearch] = useState(''); const [preset, setPreset] = useState<MonthPreset>('all');
  const [from, setFrom] = useState(schedule[0]?.date ?? ''); const [to, setTo] = useState(schedule.at(-1)?.date ?? '');
  const activeMonthKeys = useMemo(() => new Set(schedule.map((r) => r.date.slice(0, 7))), [schedule]);
  const outsidePrepayments = useMemo(() => prepayments.filter((p) => p.amount > 0 && !activeMonthKeys.has(p.date.slice(0, 7))), [prepayments, activeMonthKeys]);

  const filteredMonths = useMemo(() => {
    const rows = schedule.filter((r) => r.date >= from && r.date <= to && (!search || r.date.includes(search) || String(new Date(r.date).getFullYear()).includes(search)));
    if (preset === 'onlyPrepay') return rows.filter((r) => r.prepayment > 0);
    if (preset === 'onlyInsurance') return rows.filter((r) => r.insuranceCost > 0);
    if (preset === 'prepayYears') { const years = new Set(rows.filter((r) => r.prepayment > 0).map((r) => new Date(r.date).getFullYear())); return rows.filter((r) => years.has(new Date(r.date).getFullYear())); }
    if (preset === 'last12') return rows.slice(-12);
    if (preset === 'first12') return rows.slice(0, 12);
    return rows;
  }, [schedule, from, to, search, preset]);
  const periodPayment = filteredMonths.reduce((sum, row) => sum + row.payment + row.prepayment, 0);
  const periodInsurance = filteredMonths.reduce((sum, row) => sum + row.insuranceCost, 0);
  const yearlyRows = useMemo(() => Array.from(schedule.reduce((map, row) => {
    const year = String(new Date(row.date).getFullYear());
    const current = map.get(year) ?? { year, payments: 0, prepayments: 0, insurance: 0, real: 0, interest: 0, principal: 0 };
    current.payments += row.payment; current.prepayments += row.prepayment; current.insurance += row.insuranceCost; current.real += row.payment + row.prepayment + row.insuranceCost; current.interest += row.interest; current.principal += row.principal;
    map.set(year, current); return map;
  }, new Map<string, { year: string; payments: number; prepayments: number; insurance: number; real: number; interest: number; principal: number }>()).values()), [schedule]);

  return <div className="table-wrap"><div className="table-head"><h3>Таблица платежей</h3><div><button type="button" className={view === 'month' ? 'active-switch' : ''} onClick={() => setView('month')}>По месяцам</button><button type="button" className={view === 'year' ? 'active-switch' : ''} onClick={() => setView('year')}>По годам</button></div></div>
  {outsidePrepayments.length > 0 ? <div className="muted-note">{outsidePrepayments.map((p) => `Досрочка вне срока кредита: ${formatMoney(p.amount)} от ${fullDate(p.date)}`).join(' · ')}</div> : null}
  {view === 'month' && <><div className="filters"><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /><input type="date" value={to} onChange={(e) => setTo(e.target.value)} /><select value={preset} onChange={(e) => setPreset(e.target.value as MonthPreset)}><option value="all">все платежи</option><option value="onlyPrepay">только досрочки</option><option value="onlyInsurance">только страховки</option><option value="prepayYears">только годы с досрочками</option><option value="last12">последние 12 месяцев</option><option value="first12">первые 12 месяцев</option></select><input placeholder="Поиск год/дата" value={search} onChange={(e) => setSearch(e.target.value)} /><button type="button" onClick={() => { setPreset('all'); setSearch(''); setFrom(schedule[0]?.date ?? ''); setTo(schedule.at(-1)?.date ?? ''); }}>Сбросить фильтры</button></div><div className="period-total"><b>Итого по выбранному периоду:</b> платежи и досрочки {formatMoney(periodPayment)} · страховки {formatMoney(periodInsurance)} · реальная сумма {formatMoney(periodPayment + periodInsurance)}</div></>}
  {view === 'month' ? <><table className="desktop-payment-table"><thead><tr><th>№</th><th>Дата</th><th>Платёж</th><th>Проценты</th><th>Тело</th><th>Досрочно</th><th>Страховки / расходы</th><th>Остаток</th><th>Событие</th></tr></thead><tbody>{filteredMonths.map((row) => {
    const insuranceText = row.insuranceEvents?.length ? row.insuranceEvents.length === 1 ? `Страховка: ${row.insuranceEvents[0].title} ${formatMoney(row.insuranceEvents[0].amount)}` : `Страховки: ${row.insuranceEvents.length} события, всего ${formatMoney(row.insuranceCost)}` : '—';
    const prepayText = row.prepaymentEvents?.length ? row.prepaymentEvents.length === 1 ? `Досрочно ${formatMoney(row.prepaymentEvents[0].amount)} от ${fullDate(row.prepaymentEvents[0].date)}, ${modeLabel(row.prepaymentEvents[0].mode)}` : `Досрочно: ${formatMoney(row.prepayment)}, ${row.prepaymentEvents.length} платежа` : '—';
    const eventText = prepayText === '—' && insuranceText === '—' ? '—' : `${prepayText !== '—' ? prepayText : ''}${prepayText !== '—' && insuranceText !== '—' ? ' · ' : ''}${insuranceText !== '—' ? insuranceText : ''}`;
    return <tr key={row.monthIndex}><td>{row.monthIndex}</td><td>{row.date}</td><td>{formatMoney(row.payment)}</td><td>{formatMoney(row.interest)}</td><td>{formatMoney(row.principal)}</td><td>{formatMoney(row.prepayment)}</td><td>{formatMoney(row.insuranceCost)}</td><td>{formatMoney(row.remainingDebt)}</td><td title={eventText}>{eventText}</td></tr>;
  })}</tbody></table><div className="mobile-payment-cards">{filteredMonths.map((row) => {
    const insuranceText = row.insuranceEvents?.length ? row.insuranceEvents.length === 1 ? `Страховка: ${row.insuranceEvents[0].title} ${formatMoney(row.insuranceEvents[0].amount)}` : `Страховки: ${row.insuranceEvents.length} события, всего ${formatMoney(row.insuranceCost)}` : '';
    const prepayText = row.prepaymentEvents?.length ? row.prepaymentEvents.length === 1 ? `Досрочно ${formatMoney(row.prepaymentEvents[0].amount)} · ${modeLabel(row.prepaymentEvents[0].mode)}` : `Досрочно: ${formatMoney(row.prepayment)}, ${row.prepaymentEvents.length} платежа` : '';
    const eventText = [prepayText, insuranceText].filter(Boolean).join(' · ');
    const accent = row.prepayment > 0 ? ' has-prepayment' : row.insuranceCost > 0 ? ' has-insurance' : '';
    return <article key={row.monthIndex} className={`mobile-payment-card${accent}`}><div className="mobile-payment-card__head"><strong>{fullDate(row.date)}</strong><span>№ {row.monthIndex}</span></div><dl><div><dt>Платёж</dt><dd>{formatMoney(row.payment)}</dd></div><div><dt>Проценты</dt><dd>{formatMoney(row.interest)}</dd></div><div><dt>Тело долга</dt><dd>{formatMoney(row.principal)}</dd></div><div><dt>Досрочно</dt><dd>{formatMoney(row.prepayment)}</dd></div><div><dt>Страховки</dt><dd>{formatMoney(row.insuranceCost)}</dd></div><div><dt>Остаток тела</dt><dd>{formatMoney(row.remainingDebt)}</dd></div></dl>{eventText ? <p className="mobile-payment-event">{eventText}</p> : null}</article>;
  })}</div></> : <table><thead><tr><th>Год</th><th>Платежи</th><th>Проценты</th><th>Тело</th><th>Досрочно</th><th>Страховки за год</th><th>Реально уплачено за год</th></tr></thead><tbody>{yearlyRows.map((row) => <tr key={row.year}><td>{row.year}</td><td>{formatMoney(row.payments)}</td><td>{formatMoney(row.interest)}</td><td>{formatMoney(row.principal)}</td><td>{formatMoney(row.prepayments)}</td><td>{formatMoney(row.insurance)}</td><td>{formatMoney(row.real)}</td></tr>)}</tbody></table>}
  </div>;
}
